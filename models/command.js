'use strict';

const {Sequelize, Model} = require('sequelize');

module.exports = (sequelize) => {
    class Command extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }
    
    Command.init({
        serviceId: {
            type: Sequelize.INTEGER,
            field: 'service_id'
        },
        category: Sequelize.STRING,
        type: Sequelize.STRING,
        createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            field: 'created_at'
        },
        updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            field: 'updated_at'
        },
    }, {
        sequelize,
        timestamps: true,
        modelName: 'Command',
        tableName: 'commands'
    });

    return Command;
};