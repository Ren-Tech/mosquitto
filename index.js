const fs = require('fs');
const mqtt = require('mqtt');
const { connectOptions } = require('./use_mqtts.js');
const admin = require('firebase-admin');
const express = require('express');
const app = express();
const path = require('path');
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

const serviceAccount = require("./node-service-account.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://psmwaterquality-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const db = admin.database();

// Declare previousData object here
const previousData = {}; // Store previous data

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Add this line before your app.get('/'...) route
app.set('views', path.join(__dirname, 'views'));



// Add this line in your server initialization code
app.get('/', (req, res) => {
    // Pass the latest pH and turbidity values to the template
    res.render('index.ejs', { pH: previousData[company_sensors]?.pH, turbidity: previousData[company_sensors]?.turbidity });

    // Emit the initial values to the client when the page loads
    const initialData = { pH: previousData[company_sensors]?.pH, turbidity: previousData[company_sensors]?.turbidity };
    io.emit('realtime', initialData);
    console.log('Initial values emitted:', initialData);
});


const clientId = 'server_' + Math.random().toString(16).substring(2, 8);
const options = {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: 'admin_clarence',
    password: 'adminadmin',
    reconnectPeriod: 1000,
    rejectUnauthorized: true,
};

const { protocol, host, ports } = connectOptions;

let connectUrl = `${protocol}://${host}:${ports}`;
if (['ws', 'wss'].includes(protocol)) {
    connectUrl += '/mqtt';
}

if (['mqtts', 'wss'].includes(protocol) && fs.existsSync('./emqxsl-ca.crt')) {
    options['ca'] = fs.readFileSync('./emqxsl-ca.crt');
}

const company_sensors = 'company_sensors';
const consumer_sensors = 'consumer_sensors';
const qos = 0;

const client = mqtt.connect(connectUrl, options);

client.on('connect', () => {
    client.subscribe(company_sensors, { qos }, (error) => {
        if (error) return console.log('Subscribe error:', error);
        console.log(`${protocol}: Subscribed on '${company_sensors}'`);
    });
    client.subscribe(consumer_sensors, { qos }, (error) => {
        if (error) return console.log('Subscribe error:', error);
        console.log(`${protocol}: Subscribed on '${consumer_sensors}'`);
    });
});

client.on('reconnect', (error) => {
    console.log(`Reconnecting(${protocol}):`, error);
});

client.on('error', (error) => {
    console.log(`Cannot connect(${protocol}):`, error);
});

client.on('message', (topic, payload) => {
   
    const data = JSON.parse(payload);

    if (data.hasOwnProperty('pH')) {
        const pHValue = data['pH'];
        const previouspHValue = previousData.hasOwnProperty(topic) ? previousData[topic].pH : null;

        if (pHValue >= 5 && pHValue <= 14) {
            const pHRef = db.ref(topic + "/pH");
            pHRef.set(pHValue, (error) => {
                if (error === null) {
                    if (pHValue !== previouspHValue) {
                        console.log(`pH: ${pHValue}`);
                        // Emit the real-time event after updating the value
                        io.emit('realtime', { pH: pHValue, turbidity: previousData[company_sensors]?.turbidity });
                    }
                    previousData[topic] = { ...previousData[topic], pH: pHValue };
                } else {
                    console.log('Error saving pH value:', error);
                }
            });
        } else {
            console.log('Invalid pH value. Not saved.');
        }
    }

    if (data.hasOwnProperty('turbidity')) {
        const turbidityValue = data['turbidity'];
        const previousturbidityValue = previousData.hasOwnProperty(topic) ? previousData[topic].turbidity : null;

        if (turbidityValue >= -1 && turbidityValue <= 100) {
            const turbidityRef = db.ref(topic + "/turbidity");
            turbidityRef.set(turbidityValue, (error) => {
                if (error === null) {
                    if (turbidityValue !== previousturbidityValue) {
                        console.log(`Turbidity: ${turbidityValue}`);
                        // Emit the real-time event after updating the value
                        io.emit('realtime', { pH: previousData[company_sensors]?.pH, turbidity: turbidityValue });
                    }
                    previousData[topic] = { ...previousData[topic], turbidity: turbidityValue };
                } else {
                    console.log('Error saving turbidity value:', error);
                }
            });
        } else {
            console.log('Invalid turbidity value. Not saved.');
        }
    }
});

