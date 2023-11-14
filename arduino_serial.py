import serial

# Arduino serial connection settings
ARDUINO_SERIAL_PORT = 'COM5' 
ARDUINO_BAUD_RATE = 9600

def send_command_to_arduino(command):
    try:
        arduino = serial.Serial(ARDUINO_SERIAL_PORT, ARDUINO_BAUD_RATE, timeout=10)
        print(f"Sending command: {command} to Arduino.")
        arduino.write(command.encode())
        arduino.write(b'\n')
        arduino.flush()

        # Read and print the Arduino response
        response = arduino.readline().decode().strip()
        print("Arduino response:", response)

        arduino.close()
    except serial.SerialException:
        print("Failed to establish a connection with Arduino.")
