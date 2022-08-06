

export default class PubSub
{
    private _subscribers = {};

    constructor()
    {

    }

    on(eventChannel, callback)
    {
        if(typeof this._subscribers[eventChannel] === 'undefined') {
            this._subscribers[eventChannel] = [];
        }

        if(typeof callback !== 'function') {
            return false;
        }
        
        this._subscribers[eventChannel].push(callback);

        return true;
    }

    off(eventChannel)
    {
        if(typeof this._subscribers[eventChannel] === 'undefined') {
            return false;
        }

        delete this._subscribers[eventChannel];

        return true;
    }

    emit(eventChannel, eventData)
    {
        if(typeof this._subscribers[eventChannel] === 'undefined') {
            return false;
        }

        if(!this._subscribers[eventChannel].length) {
            return false;
        }

        for(let sI in this._subscribers[eventChannel]) {
            if(typeof this._subscribers[eventChannel][sI] !== 'function') {
                continue;
            }

            this._subscribers[eventChannel][sI](eventData);
        }
    }
}