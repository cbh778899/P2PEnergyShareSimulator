import sqlite3
import random

class DBConn():
    def __init__(self, power_simulator):
        self.power_simulator = power_simulator
        conn, cursor = self.__conn()

        cursor.execute("drop table if exists users;")
        cursor.execute("drop table if exists smart_meter_histories;")
        cursor.execute("drop table if exists batteries;")
        cursor.execute("drop table if exists ledger;")

        cursor.execute("create table users (id integer primary key not null, type integer, "+
                       "area text, username text, email text, password text, master_id integer);")
        cursor.execute("create table smart_meter_histories (user_id integer, "+
                       "generated numeric, used numeric, stored numeric, report_time numeric);")
        cursor.execute("create table batteries (user_id integer, max_capacity numeric, "+
                       "used_capacity numeric, state integer, state_of_charge numeric);")
        cursor.execute("create table ledger (time integer, consumer_id integer, prosumer_id integer,"+
                       "amount numeric);")
    
        self.__close(conn, cursor)

    def createDummyUsers(self):
        conn, cursor = self.__conn()
        self.newUser(0, 'Area 1', 'peer_1', 'peer1@energy.com', '', True, (conn, cursor))
        self.newUser(0, 'Area 1', 'peer_2', 'peer2@energy.com', '', True, (conn, cursor))
        self.newUser(0, 'Area 1', 'peer_3', 'peer3@energy.com', '', True, (conn, cursor))
        self.__close(conn, cursor)
        self.power_simulator.updateList()

    
    def __conn(self):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        return (conn, cursor)
    
    def __close(self, conn, cursor, need_commit = True):
        if need_commit: conn.commit()
        cursor.close()
        conn.close()

    def newUser(self, user_type, area, username, email, password, is_superpeer = False, db_conn = None):
        conn, cursor = db_conn or self.__conn()

        master_id = 0
        if not is_superpeer:
            # randomly assign this peer a superpeer
            superpeer_ids = [i[0] for i in cursor.execute('select id from users where master_id=0;').fetchall()]
            master_id = random.choice(superpeer_ids)

        cursor.execute('insert into users (type, area, username, email, password, master_id) values (?,?,?,?,?,?);',
                       (user_type, area, username, email, password, master_id))
        user_id = cursor.execute("select id from users order by id desc limit 1;").fetchone()[0]
        if user_type == 0:
            cursor.execute('insert into batteries values (?,?,?,?,?);',
                       (user_id, 10, 0, 0, 1))
        
        if not db_conn:
            self.__close(conn, cursor)
            self.power_simulator.updateList()
            return user_id
        return
    
    def validateUser(self, user_type, username, password):
        conn, cursor = self.__conn()

        user = cursor.execute('select id from users where type=? and (username=? or email=?) and password=?;',
                       (user_type, username, username, password)).fetchone()

        self.__close(conn, cursor, False)

        if not user: return False
        else: return user[0]

    def getBasicUserInfo(self, user_id, user_type):
        conn, cursor = self.__conn()

        info = cursor.execute("select username, email, area from users where id=? and type=?;", 
                       (user_id, user_type)).fetchone()
        
        self.__close(conn, cursor, False)
        return {
            "username": info[0],
            "email": info[1],
            "area": info[2]
        }

    def updateBatteryInfo(self, user_id, used_capacity, state, state_of_charge):
        conn, cursor = self.__conn()
        
        cursor.execute('update batteries set used_capacity=?, state=?, state_of_charge=? where user_id=?',
                       (used_capacity, state, state_of_charge, user_id))

        self.__close(conn, cursor)

    def newReport(self, user_id, generated, used, stored, report_time):
        conn, cursor = self.__conn()
        
        cursor.execute('insert into smart_meter_histories values (?,?,?,?,?);',
                       (user_id, generated, used, stored, report_time))

        self.__close(conn, cursor)

    def getEnergySummary(self, user_id, user_type):
        conn, cursor = self.__conn()

        summary = {}
        user_histories = cursor.execute('select * from smart_meter_histories '+
                                        'where user_id=?;', (user_id,)).fetchall()
        if user_histories:
            summary['total_consumption'] = round(sum([i[2] for i in user_histories]), 2)
            last_24_hours = user_histories[-24:]
            summary['period_consumption'] = round(sum([i[2] for i in last_24_hours]), 2)
            summary['last_24_hours'] = []
            for i in last_24_hours:
                summary['last_24_hours'].append({
                    'report_time': i[4],
                    'consumption': i[2]
                })
            if user_type == 0:
                summary['total_generation'] = round(sum([i[1] for i in user_histories]), 2)
                summary['period_generation'] = round(sum([i[1] for i in last_24_hours]), 2)
                for index, record in enumerate(last_24_hours):
                    summary['last_24_hours'][index]['generation'] = record[1]
                    summary['last_24_hours'][index]['stored'] = record[3]
                summary['battery_status'] = {}
                battery_status_query = cursor.execute(
                    'select * from batteries where user_id=?;', (user_id,)
                ).fetchone()
                summary['battery_status']['max_capacity'] = battery_status_query[1]
                summary['battery_status']['used_capacity'] = round(battery_status_query[2], 2)
                summary['battery_status']['state'] = battery_status_query[3]

        else: summary['no_record'] = True

        self.__close(conn, cursor, False)
        return summary
    
    def getBilling(self, user_id, user_type):
        conn, cursor = self.__conn()
        info = {}

        if user_type == 0:
            consumption_histories = cursor.execute(
                "select used from smart_meter_histories where user_id=?;", 
                (user_id,)).fetchall()
            info['days'] = int(len(consumption_histories) / 24) + 1
            info['usage'] = round(sum([i[0] for i in consumption_histories]), 2)
            sold_energies = cursor.execute(
                "select amount from ledger where prosumer_id=?;", (user_id,)).fetchall()
            info['sold'] = 0 if not sold_energies else round(sum([i[0] for i in sold_energies]), 2)
        else:
            from_grid = cursor.execute(
                "select amount from ledger where consumer_id=? and prosumer_id=0;", (user_id, )
            ).fetchall()
            from_p2p = cursor.execute(
                "select amount from ledger where consumer_id=? and not prosumer_id=0;", (user_id, )
            ).fetchall()

            info['grid_days'] = 0 if not from_grid else int(len(from_grid) / 24) + 1
            info['grid_usage'] = 0 if not from_grid else round(sum([i[0] for i in from_grid]), 2)
            info['usage'] = 0 if not from_p2p else round(sum([i[0] for i in from_p2p]), 2)

        self.__close(conn, cursor, False)
        return info

    def getOverlayPeers(self):
        conn, cursor = self.__conn()
        
        all_peers = cursor.execute("select type, id, master_id from users;").fetchall()
        peers = {
            'superpeers': [],
            'peers': []
        }
        for type, id, master in all_peers:
            this_peer = {
                'type': type,
                'id': id,
                'master': master
            }

            if master == 0: peers['superpeers'].append(this_peer)
            else: peers['peers'].append(this_peer)

        self.__close(conn, cursor, False)
        return peers