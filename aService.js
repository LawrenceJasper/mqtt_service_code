let process = require('process');
let mqtt = require('mqtt')
let client = mqtt.connect('mqtt://localhost')
let servicePID = process.pid
let serviceName = 'prefixService'
let capabilities = 'prefix'// does nothing for now
let device = 'prefix' //for serviceCheck
let directionType = 'destination'
let version = 'v1.0.0'
let srvcMngmntTopic = `srvc/${serviceName}/v1/${servicePID}`
let myPublishArrayApps = []
let chk

//capabilities could just end up being the name of the service, ask Jronk what he thinks

//publishes
// first message sent if *service* launches after the *app*

client.publish('service/mngmt', JSON.stringify({ type: 'serviceAvailable', serviceName: serviceName, directionType: directionType, version: version, pid:servicePID, from:serviceName, srvcMngmntTopic:srvcMngmntTopic, device:device}))// first message sent if service launches after the app
client.publish('system/manager', JSON.stringify({newTopic:srvcMngmntTopic}))// sends new dynamic channel to the system manager

//starting subscribes

client.subscribe('app/mngmt')
client.subscribe(srvcMngmntTopic)

client.on('message', function (topic, message) {// receives the topic and the message from any subscriptions on the service
    try{
        switch (topic) {
            case'app/mngmt':// if the service is already running, this will be the first case to hit from an app, the service
                            // receives a copy of the app's dynamic channel for communication
                try{
                    let msg = JSON.parse(message)// message parser
                    switch (msg.type) {// determines case based off the type in the message
                        case 'servicesReq':

                            myPublishArrayApps.push({topic:msg.appMngmntTopic})// copy for the service
                            // will happen before filter, this why the else exists

                            setTimeout(() => {// a delay is used to allow the stuff above to take place before the final client.publish message is sent.
                                client.publish(msg.appMngmntTopic, JSON.stringify({ type: 'serviceAvailable', serviceName: serviceName, directionType: directionType, version: version, pid:servicePID, from:serviceName, srvcMngmntTopic:srvcMngmntTopic, device:device}))
                            },700)
                            break;
                    }
                }catch (e) {
                    console.log(`Error @ servicesReq case ${e}`)// this catches any errors that could be encountered
                }
                break;
            case srvcMngmntTopic:
                try{
                    let msg = JSON.parse(message)
                    switch (msg.type) {
                        case 'serviceCapabilityRequest'://used in both cases, that's why we have a check here, to avoid duplicates!

                            chk = myPublishArrayApps.findIndex((index) => index.topic === msg.appMngmntTopic)// check var will either find an index or it won't, if it doesn't, the response is -1
                            if(chk === -1){ //if not found inside of the array
                                myPublishArrayApps.push({topic:msg.appMngmntTopic})// after check, if it's not already inside the array, it's pushed
                            }
                            setTimeout(() => {// delay so that messages flow correctly
                                client.publish(msg.appMngmntTopic, JSON.stringify({ type: 'serviceCapabilityResp', name:serviceName, capabilities:capabilities, from:serviceName, srvcMngmntTopic:srvcMngmntTopic}));
                            },700)
                            break;
                        case 'serviceConfig':

                            console.log('Service-Config')

                            console.log({from:serviceName,myPublishArrayApps:myPublishArrayApps})

                            // here configuration would take place
                            //config happens....


                            break;
                        case 'dataToBinary':

                            console.log(msg.data)// message from the prefix app

                            break;
                        case 'removeAppFromPublishArray':
                            let myIndex = myPublishArrayApps.findIndex((index) => index.topic === msg.appMngmntTopic)// process to remove any app that rejects the service
                            console.log({myIndex:myIndex})
                            myPublishArrayApps.splice(myIndex,1)
                            break;
                    }
                }catch (e) {
                    console.log(`Error @ serviceCapabilityRequest or serviceConfig or removeAppPublishArray, ${e}`)
                }
                break;
        }

    }catch (e) {
        console.log(`Error @ app/mngmt or ${srvcMngmntTopic} case ${e}`)
    }
})
