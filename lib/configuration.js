module.exports = {
    config: {
        actions: {
            type: "object",
            title: "Actions",
            properties: {
                equalquotes: {
                    title: "Equal+quotes",
                    description: "Check if you want to automatically add quotes when pressing = in HTML tags",
                    type: "boolean",
                    default: true
                },
                parallellEdit: {
                    title: "Parallell Tag Edit",
                    description: "Check if you want tag pairs to automatically change when editing one of them",
                    type: "boolean",
                    default: true
                },
            }
        }
    }
}
