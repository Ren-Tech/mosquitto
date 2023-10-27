#include <ESP8266WiFi.h>
#include <PubSubClient.h>

const char *mqtt_broker = "i8d3d352.ala.us-east-1.emqxsl.com"; // broker address
const char *topic = "company_sensors";                         // define topic
const char *mqtt_username = "admin_clarence";                  // username for authentication
const char *mqtt_password = "adminadmin";                      // password for authentication
const int mqtt_port = 8883;                                    // port of MQTT over TLS/SSL

WiFiClientSecure espClient;
PubSubClient client(espClient);

const char *fingerprint = "42:AE:D8:A3:42:F1:C4:1F:CD:64:9C:D7:4B:A1:EE:5B:5E:D7:E2:B5";

void setup()
{
    Serial.begin(9600);

    WiFiManager wifiManager;
    WiFi.disconnect(true);

    if (!wifiManager.autoConnect("Wi-Fi Manager", "wifi_manager"))
    {
        Serial.println("Failed to connect or configure. Restarting...");
        ESP.restart();
    }

    if (WiFi.status() == WL_CONNECTED)
    {
        Serial.println("Connected: " + WiFi.SSID());
    }
    else
    {
        Serial.println("Not Connected");
    }

    espClient.setFingerprint(fingerprint);
    client.setServer(mqtt_broker, mqtt_port);
    client.setCallback(callback);

    while (!client.connected())
    {
        String client_id = "esp8266-client-";
        client_id += String(WiFi.macAddress());
        Serial.printf("The client %s connects to the mqtt broker\n", client_id.c_str());
        if (client.connect(client_id.c_str(), mqtt_username, mqtt_password))
        {
            Serial.println("Connected to MQTT broker.");
        }
        else
        {
            Serial.print("Failed to connect to MQTT broker, rc=");
            Serial.print(client.state());
            Serial.println(" Retrying in 5 seconds.");
            delay(5000);
        }
    }
}

void sendSensorData(const char *sensorType, float sensorValue)
{
    const payload = '{"pH": 12}';
    client.publish(topic, String(payload).c_str(), true);
}

void callback(char *topic, byte *payload, unsigned int length)
{
}

void loop()
{
    while (Serial.available() > 0)
    {
        String data = Serial.readStringUntil('\n');
        if (data.startsWith("pH: "))
        {
            float pHValue = data.substring(4).toFloat();
            sendSensorData("pH", pHValue);
        }
        else if (data.startsWith("Turbidity: "))
        {
            int turbidity = data.substring(11).toInt();
            sendSensorData("turbidity", turbidity);
        }
    }
    delay(1000);
}