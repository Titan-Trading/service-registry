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

    async addInstance(serviceId, serviceInstance)
    {
        if(!serviceId || !serviceInstance) {
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
                supportedCommunicationChannels: serviceInstance.supportedCommunicationChannels,
                hostname: serviceInstance.hostname,
                port: serviceInstance.port
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
                instanceId: serviceInstance.instanceId
            }
        });
        
        if(foundInstances) {
            return false;
        }

        await ServiceInstance.create({
            serviceId: service.id,
            serviceName: service.name,
            instanceId: serviceInstance.instanceId,
            status: serviceInstance.status
        });

        // service endpoints
        if(serviceInstance.endpoints) {
            for(let iE in serviceInstance.endpoints) {
                const ep = serviceInstance.endpoints[iE];
    
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
        if(serviceInstance.commands) {
            for(let iC in serviceInstance.commands) {
                const com = serviceInstance.commands[iC];
    
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

    async updateInstance(instanceId, updatedServiceInstance)
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