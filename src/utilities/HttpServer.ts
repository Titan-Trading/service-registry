import PubSub from "./PubSub";
import express from 'express';
import bodyParser from 'body-parser';

/**
 * Http server class
 */

export default class HttpServer
{
    private _app;
    private _server;
    private _pubSub: PubSub;

    constructor()
    {
        this._pubSub = new PubSub();

        this._app = express();

        // body parser (json api)
        this._app.use(bodyParser.json());
    }

    start(port)
    {
        const context = this;

        // start http server on a given port
        this._server = this._app.listen(port);

        // setup global request listener
        this._app.use((req, res, next) => {
            const requestHash = req.method + '-' + req.path;
            console.log(requestHash);
            context._pubSub.emit('onRequest_' + requestHash, {req, res, next});
        });

        this._app.use((req, res) => {
            return res.status(404).json({
                message: 'Not found'
            });
        })
    }

    stop()
    {
        this._server.close();
    }

    on(method: string, path: string, callback: (req, res, next) => void)
    {
        const requestHash = method + '-' + path;
        this._pubSub.on('onRequest_' + requestHash, callback);
    }
}