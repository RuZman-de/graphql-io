(async () => {
    const { Server } = require("graphql-io-server")
    const { Client } = require("graphql-io-client")

    /*
    **  ==== SERVER ====
    */

    const server = new Server({ url: "http://127.0.0.1:12345" })
    server.at("graphql-schema", () => `
        extend type Root {
            counter: Counter
        }
        type Counter {
            value:    Int
            increase: Counter
        }
    `)
    let counter = {
        value: 0
    }
    server.at("graphql-resolver", () => ({
        Root: {
            counter: (obj, args, ctx, info) => {
                ctx.scope.record("Counter", 0, "read", "direct", "one")
                return counter
            }
        },
        Counter: {
            increase: (obj, args, ctx, info) => {
                counter.value++
                ctx.scope.record("Counter", 0, "update", "direct", "one")
                return counter
            }
        }
    }))
    await server.start()

    /*
    **  ==== CLIENT #1 ====
    */

    const client1 = new Client({ url: "http://127.0.0.1:12345" })
    await client1.connect()
    let subscription = client1.query(`
        subscription {
            counter {
                value
            }
        }
    `).subscribe((result) => {
        console.log("Client #1: Result:", result.data)
    })

    /*
    **  ==== CLIENT #2 ====
    */

    const client2 = new Client({ url: "http://127.0.0.1:12345" })
    await client2.connect()
    setInterval(async () => {
        let result = await client2.query(`
            mutation {
                counter {
                    increase { value }
                }
            }
        `)
        console.log("Client #2: Result:", result.data)
    }, 1 * 1000)

})().catch((err) => {
    console.log("ERROR", err)
})
