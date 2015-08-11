function Imager(image, maxClients)
{
        this.startImage = function()
        {
                images = fs.readdirSync("/images");
        };

        return this;
}

module.exports = Imager;
