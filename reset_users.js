const resetUsers = async (db) => {

    for (let name = 'A'.charCodeAt(); name <= 'J'.charCodeAt(); name++) {
        await db.collection('user_portfolios').doc(String.fromCharCode(name)).set({
            user_name: String.fromCharCode(name),
            stocks:0,
            fiat: 0
        })
    }

    

}

module.exports = resetUsers