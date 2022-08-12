import MessageBus from './utilities/MessageBus';
import HttpServer from './utilities/HttpServer';
import ServiceRepository from './repositories/ServiceRepository';
import { sleep } from './utilities/helpers';

/**
 * System class that manages everything
 */

export default class System
{
    private _messageBus: MessageBus;
    private _httpServer: HttpServer;
    private _services: ServiceRepository;

    constructor()
    {
        this._messageBus = new MessageBus(process.env.CLIENT_ID, process.env.GROUP_ID, [process.env.KAFKA_BOOTSTRAP_SERVER]);
        this._httpServer = new HttpServer();
        this._services = new ServiceRepository();
    }

    async start()
    {
        const context = this;

        console.log('System: starting...');

        return new Promise(async (resolve, reject) => {
            try {
                /**
                 * When connected to message bus
                 * - register service with service registry
                 */
                context._messageBus.onConnect(() => {
                    // let the service registry know that a new micro-service is online
                    // console.log('let other service registry instances know we are online');
                    context._messageBus.sendEvent('service-registry', 'SERVICE_ONLINE', {
                        instanceId: process.env.INSTANCE_ID,
                        serviceId: process.env.SERVICE_ID,
                        supportedCommunicationChannels: ['rest', 'bus'],
                        hostname: 'registry-proxy',
                        port: 8003,
                        endpoints: [
                            {
                                url: '/services',
                                method: 'get'
                            }
                        ],
                        commands: []
                    });
                });

                /**
                 * When changes are made to services (on message bus)
                 */
                context._messageBus.onMessage('service-registry', async (data) => {
                    // ignore responses
                    if(data.messageType == 'RESPONSE') {
                        return;
                    }

                    console.log(data.messageType.toLowerCase() + ' (message bus)', data);

                    if(data.messageType == 'EVENT' && data.eventId == 'SERVICE_ONLINE') {
                        context._services.addInstance(data.serviceId, {
                            instanceId: data.instanceId,
                            supportedCommunicationChannels: data.supportedCommunicationChannels,
                            hostname: data.hostname,
                            port: data.port,
                            endpoints: data.endpoints,
                            commands: data.commands,
                            status: 'online'
                        });
                    }
                    else if(data.messageType == 'EVENT' && data.eventId == 'SERVICE_OFFLINE') {
                        context._services.updateInstanceStatus(data.instanceId, {
                            status: 'offline'
                        });
                    }
                    else if((data.messageType == 'QUERY' && data.queryId == 'SERVICE_LIST') || (data.messageType == 'REQUEST' && data.routeId && data.routeId == 'get-/services')) {
                        data.messageType = 'RESPONSE';
                        data.responseCode = 200;
                        data.response = await context._services.getAll();

                        // console.log('get all services', data.messageType + ' ' + data.queryId);

                        // reply to outgoing message channel
                        context._messageBus.sendMessage('service-registry', data);
                    }
                });

                /**
                 * When a request is sent to the rest server for list of services
                 */
                context._httpServer.on('get', '/services', async (req, res) => {
                    const allServices = await context._services.getAll();

                    return res.status(200).json(allServices);
                });

                /**
                 * Connect to message bus
                 */
                 if(process.env.MESSAGE_BUS !== 'false') {
                    console.log('System: connecting to message bus...');
                    context._messageBus.connect();
                }

                /**
                 * Start http/rest server
                 */
                if(process.env.REST_SERVER !== 'false') {
                    console.log('System: starting http server');
                    context._httpServer.start(process.env.REST_PORT);
                }

                resolve(true);
            }
            catch(err) {
                console.log('System error: ', err);
                
                console.log('System: wait 10 seconds before reconnecting...');
                await sleep(10 * 1000);

                console.log('System: reconnecting to message bus...');
                context._messageBus.disconnect();
                context._messageBus.connect();

                console.log('System: starting http server...');
                context._httpServer.stop();
                context._httpServer.start(process.env.REST_PORT);

                resolve(false);
            }
        });
    }

    async stop()
    {
        try {
            // let the service registry know that a micro-service is offline
            console.log('System: updating service registry (SERVICE_OFFLINE)...');
            await this._messageBus.sendEvent('service-registry', 'SERVICE_OFFLINE', {
                instanceId: process.env.INSTANCE_ID,
                serviceId:  process.env.SERVICE_ID
            });
            console.log('System: service registry updated');

            console.log('System: stopping http server...');
            this._httpServer.stop();
            console.log('System: http server stopped');

            console.log('System: disconnecting from message bus...');
            await this._messageBus.disconnect();
            console.log('System: disconnected from message bus');
        }
        catch(err) {
            console.log('System error: ', err);
            return;
        }
    }
}