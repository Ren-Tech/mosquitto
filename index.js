const fs = require('fs')
const mqtt = require('mqtt')
const { connectOptions } = require('./use_mqtts.js')
const admin = require("firebase-admin");
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const serviceAccount = require("./node-service-account.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
        "https://psmwaterquality-default-rtdb.asia-southeast1.firebasedatabase.app",
});

const db = admin.database();

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  app.get('/', (req, res) => {
    res.send('Server is running'); // 
  });


  

const clientId = 'server_' + Math.random().toString(16).substring(2, 8)
const options = {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: 'admin_clarence',
    password: 'adminadmin',
    reconnectPeriod: 1000,
    rejectUnauthorized: true,
}

const { protocol, host, ports } = connectOptions

let connectUrl = `${protocol}://${host}:${ports}`
if (['ws', 'wss'].includes(protocol)) {
    connectUrl += '/mqtt'
}

if (['mqtts', 'wss'].includes(protocol) && fs.existsSync('./emqxsl-ca.crt')) {
    options['ca'] = fs.readFileSync('./emqxsl-ca.crt')
}

const company_sensors = 'company_sensors'
const consumer_sensors = 'consumer_sensors'
const qos = 0

const client = mqtt.connect(connectUrl, options)
client.on('connect', () => {
    client.subscribe(company_sensors, { qos }, (error) => {
        if (error) return console.log('Subscribe error:', error)
        console.log(`${protocol}: Subcribed on '${company_sensors}'`)
    })
    client.subscribe(consumer_sensors, { qos }, (error) => {
        if (error) return console.log('Subscribe error:', error)
        console.log(`${protocol}: Subcribed on '${consumer_sensors}'`)
    })
})
client.on('reconnect', (error) => {
    console.log(`Reconnecting(${protocol}):`, error)
})

client.on('error', (error) => {
    console.log(`Cannot connect(${protocol}):`, error)
})

client.on('message', (topic, payload) => {
    const data = JSON.parse(payload);
    const now = new Date();
    const date = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`;
    const time = now.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const currentTime = `${date} | ${time}`;

    if (data.hasOwnProperty('pH')) {
        const pHValue = data['pH'];

        if (pHValue >= 5 && pHValue <= 14) {
            const pHRef = db.ref(topic + "/pH");
            pHRef.set(pHValue, (error) => {
                if (error === null) {
                    console.log(`pH: ${pHValue}, Time: ${currentTime}`);
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

        if (turbidityValue >= -1 && turbidityValue <= 100) {
            const turbidityRef = db.ref(topic + "/turbidity");
            turbidityRef.set(turbidityValue, (error) => {
                if (error === null) {
                    console.log(`Turbidity: ${turbidityValue}, Time: ${currentTime}`);
                } else {
                    console.log('Error saving turbidity value:', error);
                }
            });
        } else {
            console.log('Invalid turbidity value. Not saved.');
        }
    }
});

