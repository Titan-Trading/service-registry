import db from '../../models/index';
import ServiceFactory from '../../models/service';
import ServiceInstanceFactory from '../../models/serviceinstance';
import EndpointFactory from '../../models/endpoint';
import CommandFactory from '../../models/command';

const Service = ServiceFactory(db.sequelize);
const ServiceInstance = ServiceInstanceFactory(db.sequelize);
const Endpoint = EndpointFactory(db.sequelize);
const Command = CommandFactory(db.sequelize);

export default class ServiceRepository
{
    constructor() {

    }

    async getAll()
    {
        const services = await Service.findAll({
            subQuery: false,
            include: { all: true },
        });

        return services;
    }

    async addInstance(serviceId, serviceInstanceData)
    {
        if(!serviceId || !serviceInstanceData) {
            return false;
        }
        
        // service find or create
        const foundServices = await Service.findAll({
            where: {
                name: serviceId
            }
        });
        
        let service = null;
        if(!foundServices.length) {
            service = await Service.create({
                name: serviceId,
                supportedCommunicationChannels: serviceInstanceData.supportedCommunicationChannels,
                hostname: serviceInstanceData.hostname,
                port: serviceInstanceData.port
            });
        }
        else {
            service = foundServices[0];
        }

        // service instance find or create
        const foundInstances = await ServiceInstance.count({
            where: {
                serviceId: service.id,
                serviceName: service.name,
                instanceId: serviceInstanceData.instanceId
            }
        });
        
        let serviceInstance = null;
        if(!foundInstances) {
            serviceInstance = await ServiceInstance.create({
                serviceId: service.id,
                serviceName: service.name,
                instanceId: serviceInstanceData.instanceId,
                status: serviceInstanceData.status
            });
        }
        else {
            serviceInstance = foundInstances[0];
        }

        // service endpoints
        if(serviceInstanceData.endpoints) {

            // delete all the endpoints
            const deleteEndpoints = await Endpoint.destroy({
                where: {
                    serviceId: service.id
                }
            });

            for(let iE in serviceInstanceData.endpoints) {
                const ep = serviceInstanceData.endpoints[iE];
    
                const foundEndpoints = await Endpoint.count({
                    where: {
                        serviceId: service.id,
                        url: ep.url,
                        method: ep.method
                    }
                });
    
                if(!foundEndpoints) {
                    await Endpoint.create({
                        serviceId: service.id,
                        url: ep.url,
                        method: ep.method
                    });
                }
            }
        }

        // service commands
        if(serviceInstanceData.commands) {

            // delete all the commands
            const deleteCommands = await Command.destroy({
                where: {
                    serviceId: service.id
                }
            });

            for(let iC in serviceInstanceData.commands) {
                const com = serviceInstanceData.commands[iC];
    
                const foundCommands = await Command.count({
                    where: {
                        serviceId: service.id,
                        category: com.category,
                        type: com.type
                    }
                });
    
                if(!foundCommands) {
                    await Command.create({
                        serviceId: service.id,
                        category: com.category,
                        type: com.type
                    });
                }
            }
        }

        return true;
    }

    async updateInstanceStatus(instanceId, updatedServiceInstance)
    {
        await ServiceInstance.update({
            status: updatedServiceInstance.status
        }, {
            where: {
                instance_id: instanceId
            }
        });

        return true;
    }
}