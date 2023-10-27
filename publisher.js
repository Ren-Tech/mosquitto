const fs = require('fs')
const mqtt = require('mqtt')
const { connectOptions } = require('./use_mqtts.js')
const express = require("express");
const app = express(port = 8000);

app.use(express.json());

app.post("/send", async (req, res) => {
    try {
        const data = req.body;
        const payload = JSON.stringify(data);
        client.publish("company_sensors", payload, { qos }, (error) => {
            if (error) {
                console.error(error)
            }
        })

        res.status(200).json({ success: data });
    } catch (error) {
        console.error("Error adding data to Firestore:", error);
        res.status(500).json({ error: "Data could not be added to Firestore." });
    }

});

app.use((err, _, res, __) => {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
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

const client = mqtt.connect(connectUrl, options)

const company_sensors = 'company_sensors'
const qos = 0

client.on('connect', () => {
    client.subscribe(company_sensors, { qos }, (error) => {
        if (error) return console.log('Subscribe error:', error)

        console.log(`${protocol}: Subcribing on '${company_sensors}'`)
    })
})

client.on('reconnect', (error) => {
    console.log(`Reconnecting(${protocol}):`, error)
})

client.on('error', (error) => {
    console.log(`Cannot connect(${protocol}):`, error)
})

client.on('message', (topic, payload) => {
    console.log('Received Message:', topic, payload.toString())
})