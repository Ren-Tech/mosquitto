#include <ESP8266WiFi.h>
#include <PubSubClient.h>

// WiFi
const char *ssid = "[WIFI SSID]";         // Enter your WiFi name
const char *password = "[WIFI password]"; // Enter WiFi password

const char *mqtt_broker = "i8d3d352.ala.us-east-1.emqxsl.com"; // broker address
const char *topic = "sensors";                                 // define topic
const char *mqtt_username = "admin_henrii";                    // username for authentication
const char *mqtt_password = "adminadmin";                      // password for authentication
const int mqtt_port = 8883;                                    // port of MQTT over TLS/SSL

WiFiClientSecure espClient;
PubSubClient client(espClient);

const char *fingerprint = "42:AE:D8:A3:42:F1:C4:1F:CD:64:9C:D7:4B:A1:EE:5B:5E:D7:E2:B5";

void setup()
{
    Serial.begin(115200);

    // Initialize Wi-FiManager
    WiFiManager wifiManager;

    // Disconnect Wi-Fi every time the device powers off (remove if not needed)
    WiFi.disconnect(true);

    // Connect to Wi-Fi or configure credentials
    if (!wifiManager.autoConnect("Wi-Fi Manager", "wifi_manager"))
    {
        Serial.println("Failed to connect or configure. Restarting...");
        ESP.restart();
    }

    // Print connection status
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

    client.publish(topic, "hello emqx");
    client.subscribe(topic);
}

void sendSensorData()
{
    client.publish(topic, "hello everyone");
}

void callback(char *topic, byte *payload, unsigned int length) {}

void loop()
{
    if (!client.connected())
    {
        reconnect();
    }
    client.loop();
}