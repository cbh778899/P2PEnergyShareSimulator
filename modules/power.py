import sqlite3
import threading
from time import sleep
from random import uniform

class PowerSimulator():
    def __init__(self):
        self.id_list = []
        self.running_list = []
        self.time = 8
        self.light = 0
        self.thread_end = False
        self.db_writing = False
        self.updateThread = threading.Thread(None, self.__updateTime, 'update-time')
        self.updateThread.start()

    def updateList(self):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        users = cursor.execute('select id, type from users;').fetchall()
        for user_id, user_type in users:
            if user_id not in self.id_list:
                self.id_list.append(user_id)
                new_thread = threading.Thread(None, self.__runSimulate, f'simulate-{user_id}', 
                    args=(user_id, user_type))
                new_thread.start()
                self.running_list.append(new_thread)

        cursor.close()
        conn.close()

    def __runSimulate(self, user_id, user_type):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()  

        last_time = -1

        while not self.thread_end:
            sleep(0.1)
            if last_time != self.time: last_time = self.time
            else: continue

            time_of_day = self.time % 24
            consumption = 0
            generation = 0
            stored = 0
            # consumption 0:00 - 5:00
            if time_of_day >= 0 and time_of_day <= 5:
                consumption += uniform(0.15, 0.2)
            # consumption 6:00 - 11:00
            elif time_of_day > 5 and time_of_day <= 11:
                consumption += uniform(0.15, 0.25)
            # consumption 12:00 - 16:00
            elif time_of_day > 11 and time_of_day <= 16:
                consumption += uniform(0.2, 0.3)
            # consumption 17:00 - 23:00
            elif time_of_day > 16 and time_of_day <= 23:
                consumption += uniform(0.25, 0.5)

            # if prosumer, generation according to light condition
            if user_type == 0:
                generation += 1 * self.light
                # generation - consumption > 0 ? store to battery : get from battery
                difference = generation - consumption
                battery_max, battery_used = cursor.execute(
                    "select max_capacity, used_capacity from batteries where user_id=?;", (user_id,)
                ).fetchone()
                new_battery_used = battery_used + difference
                if new_battery_used > battery_max: new_battery_used = battery_max
                elif new_battery_used < 0: new_battery_used = 0

                while self.db_writing: sleep(0.01)
                self.db_writing = True
                cursor.execute("update batteries set used_capacity=?, state=? where user_id=?;",
                               (round(new_battery_used, 2), 1 if difference > 0 else 0, user_id))
                conn.commit()
                self.db_writing = False

                stored = max(new_battery_used - battery_used, 0)

            else:
                from_battery = cursor.execute("select user_id from batteries where used_capacity>=2 "+
                                              " order by used_capacity desc limit 1;").fetchone()
                if from_battery:
                    while self.db_writing: sleep(0.01)
                    self.db_writing = True
                    cursor.execute('update batteries set used_capacity=used_capacity-? where user_id=?;', 
                                   (consumption, from_battery[0]))
                    cursor.execute('insert into ledger values (?,?,?,?);', (self.time, user_id, from_battery[0], consumption))
                    self.db_writing = False
                else:
                    while self.db_writing: sleep(0.01)
                    self.db_writing = True
                    cursor.execute('insert into ledger values (?,?,?,?);', (self.time, user_id, 0, consumption))
                    self.db_writing = False
                
            while self.db_writing: sleep(0.01)
            self.db_writing = True
            cursor.execute("insert into smart_meter_histories values (?,?,?,?,?);",
                            (user_id, round(generation, 2), round(consumption, 2), 
                            round(stored, 2), self.time))
            conn.commit()
            self.db_writing = False

        cursor.close()
        conn.close()
        
    def __updateTime(self):
        while not self.thread_end:
            sleep(1)
            self.time += 1
            time_of_day = self.time % 24
            if (time_of_day >= 0 and time_of_day <= 6) or (time_of_day >= 18 and time_of_day <= 23):
                self.light = 0
            else: self.light = uniform(0.5, 1)

    def stopThreads(self):
        self.thread_end = True
        self.updateThread.join()
        for i in self.running_list:
            i.join()

    def getTime(self):
        return self.time