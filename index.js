const fs = require('fs')
const mqtt = require('mqtt')
const { connectOptions } = require('./use_mqtts.js')
const admin = require("firebase-admin");

// For Express
const express = require('express');
const app = express(port = 3000);
// End Express

const serviceAccount = require("./node-service-account.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL:
        "https://node-firebase-1e1af-default-rtdb.asia-southeast1.firebasedatabase.app/",
});
const db = admin.database();

let client = null;

const clientId = 'server_' + Math.random().toString(16).substring(2, 8)
const options = {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: 'admin_henrii',
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

app.get('/connect', (req, res) => {
    client = mqtt.connect(connectUrl, options)
    client.on('connect', () => {
        client.subscribe(company_sensors, { qos }, (error) => {
            if (error) return console.log('Subscribe error:', error)
            console.log(`${protocol}: Subcribing on '${company_sensors}'`)
        })
        client.subscribe(consumer_sensors, { qos }, (error) => {
            if (error) return console.log('Subscribe error:', error)
            console.log(`${protocol}: Subcribing on '${consumer_sensors}'`)
        })
    })
    client.on('reconnect', (error) => {
        console.log(`Reconnecting(${protocol}):`, error)
    })

    client.on('error', (error) => {
        console.log(`Cannot connect(${protocol}):`, error)
    })

    client.on('message', (topic, payload) => {
        const ref = db.ref(topic);
        const data = JSON.parse(payload);
        ref.set(data, (error) => {
            if (error == null) console.log('Succesfully saved.');

        });
    })
    res.send('Connected');
});

app.get('/disconnect', (req, res) => {
    client.unsubscribe(company_sensors, { qos }, (error) => {
        if (error) {
            console.log('unsubscribe error:', error)
            return
        }
        console.log(`Unsubscribed topic: ${company_sensors}`)
    })
    client.unsubscribe(consumer_sensors, { qos }, (error) => {
        if (error) {
            console.log('unsubscribe error:', error)
            return
        }
        console.log(`Unsubscribed topic: ${consumer_sensors}`)
    })
    if (client.connected) {
        try {
            client.end(false, () => {
                console.log('Disconnected successfully')
            })
        } catch (error) {
            console.log('Disconnect error:', error)
        }
    }
    res.send('Disconnected');
});

app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});

// Express for UI
app.get('/', (req, res) => {
    // Here you can render HTML elements
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>IoT-Based-Water-Quality-Monitoring-System</title>
        </head>
        <body>
          <h1>Welcome to IoT-Based-Water-Quality-Monitoring-System!</h1>
        </body>
      </html>
    `;

    res.send(html);
});