from flask import Flask, render_template, request, jsonify
from modules.data import DBConn
from modules.power import PowerSimulator

app = Flask(__name__)

@app.route("/")
def root():
    return render_template('index.html')

@app.route("/dummy-users", methods=['POST'])
def dummyUsers():
    db.createDummyUsers()
    return jsonify({"status": True})

@app.route("/new-user", methods=['POST'])
def newUser():
    req = request.json
    user_id = db.newUser(
        req['user_type'],
        req['area'],
        req['username'],
        req['email'],
        req['password']
    )
    return jsonify({'user_id': user_id})

@app.route("/login", methods=['POST'])
def login():
    req = request.json
    user_id = db.validateUser(
        req['user_type'],
        req['username'],
        req['password']
    )
    if not user_id: return jsonify({"login_failed": True})
    else: return jsonify({"user_id": user_id})

@app.route("/basic-user-info/<user_type>/<user_id>")
def getBasicInfo(user_type, user_id):
    return jsonify(db.getBasicUserInfo(int(user_id), int(user_type)))

@app.route("/energy-summary/<user_type>/<user_id>")
def getSummary(user_type, user_id):
    return jsonify(db.getEnergySummary(int(user_id), int(user_type)))

@app.route("/billing/<user_type>/<user_id>")
def getBilling(user_type, user_id):
    return jsonify(db.getBilling(int(user_id), int(user_type)))

@app.route("/overlay-peers")
def getOverlayPeers():
    return jsonify(db.getOverlayPeers())

if __name__ == '__main__':
    power_simulator = PowerSimulator()
    db = DBConn(power_simulator)
    app.run(port=8000, threaded=True)