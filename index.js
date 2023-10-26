const mqtt = require('mqtt')
const fs = require('fs')
const { connectOptions } = require('./use_mqtts.js')

const clientId = 'emqx_nodejs_' + Math.random().toString(16).substring(2, 8)
const options = {
    clientId,
    clean: true,
    connectTimeout: 4000,
    username: 'admin_henrii',
    password: 'adminadmin',
    reconnectPeriod: 1000,
    rejectUnauthorized: true,
}

const { protocol, host, port } = connectOptions

let connectUrl = `${protocol}://${host}:${port}`
if (['ws', 'wss'].includes(protocol)) {
    connectUrl += '/mqtt'
}

if (['mqtts', 'wss'].includes(protocol) && fs.existsSync('./emqxsl-ca.crt')) {
    options['ca'] = fs.readFileSync('./emqxsl-ca.crt')
}

const client = mqtt.connect(connectUrl, options)

const topic = 'sensors'
const payload = 'nodejs mqtt test'
const qos = 0

client.on('connect', () => {
    client.subscribe(topic, { qos }, (error) => {
        if (error) {
            console.log('subscribe error:', error)
            return
        }
        console.log(`${protocol}: Subscribe to topic '${topic}'`)
        client.publish(topic, payload, { qos }, (error) => {
            if (error) {
                console.error(error)
            }
        })
    })
})

client.publish(topic, payload, { qos }, (error) => {
    if (error) {
        console.error(error)
    }
    // Define the URL you want to send the POST request to
    const url = 'https://firebase-node.onrender.com/company_sensors';

    // Data to be sent in the POST request body (you can use an object and convert it to JSON)
    const data = {
        "pH": 12,
        "turbidity": 13,
    };

    // Create a request object with method 'POST', headers, and the data as JSON
    const request = new Request(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    // Use the fetch function to send the POST request
    fetch(request)
        .then(response => {
            // Check if the response status is OK (status code 200)
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            // Parse the response as JSON if needed
            return response.json();
        })
        .then(responseData => {
            // Handle the response data
            console.log('Response received:', responseData);
        })
        .catch(error => {
            // Handle any errors that occurred during the POST request
            console.error('POST request error:', error);
        });
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