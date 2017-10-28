'use babel'

// BOOTLOADER

const HTMLUtilities = require("./html-utilities");
const ConfigSchema = require("./configuration.js");

export default {

    config: ConfigSchema.config,
    utilities: new HTMLUtilities.default(),

    activate(state) {
        this.utilities.activate(state);
    },

    serialize() {
        return this.utilities.serialize();
    },

    deserialize() {
        this.utilities.deserialize();
    },

    deactivate() {
        this.utilities.deactivate();
    }

}
