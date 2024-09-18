from flask import jsonify, render_template, request, Response, send_from_directory
from . import router
import time
import threading
import os
from datetime import datetime

__controller = None

@router.route('/')
def index():
    upload_status = __controller.is_upload_on()
    ip = os.getenv('HOST', '127.0.0.1')
    port = int(os.getenv('PORT', 5000))
    server_ip = f"http://{ip}:{port}"
    moisture_scale_min = int(os.getenv("MOISTURE_IN_FRONTEND_MIN", 0))
    moisture_scale_max = int(os.getenv("MOISTURE_IN_FRONTEND_MAX", 100))
    timestamp = datetime.now().timestamp()
    return render_template('index.html', server_ip=server_ip, moisture_scale_min=moisture_scale_min, moisture_scale_max=moisture_scale_max, timestamp=timestamp, upload_status=upload_status)

@router.route('/sensors/interpolated', methods=['GET'])
def get_last_sensor_data_with_interpolation():
    return jsonify(__controller.get_last_sensor_data_with_interpolation())

@router.route('/sensors/', methods=['GET'])
def get_last_sensor_data():
    return jsonify(__controller.get_last_sensor_data())

@router.route('/irrigation/history', methods=['GET'])
def get_history_irrigation_data():
    seconds = request.args.get('seconds', default=None, type=int)
    return jsonify(__controller.get_all_irrigation_data(seconds))

@router.route('/irrigation/', methods=['GET'])
def get_last_irrigation_data():
    return jsonify(__controller.get_last_irrigation_data())

@router.route('/irrigation/slider', methods=['POST'])
def set_irrigation_value():
    value = request.args.get('value', default=None, type=float)
    print(f"NEW OPTIMAL: {value}")
    __controller.set_new_optimal_value(value)
    return Response(status=200)

@router.route('/irrigation/matrix', methods=['POST'])
def set_irrigation_matrix():
    data = request.get_json()
    matrix = data.get('matrix', None)
    __controller.set_new_optimal_matrix(matrix)
    average = __controller.get_optimal_matrix_average()
    return jsonify(average)

@router.route('/irrigation/mode', methods=['POST'])
def set_irrigation_mode():
    mode = request.args.get('mode', default=None, type=str)
    __controller.set_irrigation_mode(mode)
    return Response(status=200)

@router.route('/pump/', methods=['POST'])
def set_pump_state():
    __controller.toggle_pump()
    pump_state = __controller.get_pump_state()
    return jsonify(pump_state.name)

@router.route('/pump/state', methods=['GET'])
def get_pump_state():
    pump_state = __controller.get_pump_state()
    return jsonify(pump_state.name)

@router.route('/irrigation/optimal/', methods=['GET'])
def get_optimals():
    return jsonify(__controller.get_optimals())

@router.route('/irrigation/optimal/image/<imageId>', methods=['GET'])
def get_optimal_matrix_image(imageId):
    return send_from_directory('../assets', imageId + '.png')

@router.route('/stop_upload', methods=['POST'])
def stop_upload():
    __controller.stop_upload()
    return Response(status=200)

@router.route('/start_upload', methods=['POST'])
def start_upload():
    __controller.start_upload()
    return Response(status=200)

def start_flask(host, port, controller):
    global __controller
    __controller = controller
    router.run(host=host, port=port)
