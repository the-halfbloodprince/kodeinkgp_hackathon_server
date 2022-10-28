const express = require('express')
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app')
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore')
const { getDataFromDB } = require('./utils')
const resetUsers = require('./reset_users')

const serviceAccountCredentials = require('./service_account_credentials.json')

const app = express()

initializeApp({
    credential: cert(serviceAccountCredentials)
})

const db = getFirestore()


// req = {
//     fields_needed: ['users-portfolio', 'current-market-price']
// }

app.get('/reset-users', async (req, res) => {
    await resetUsers(db)
})

app.get('/user-portfolios', async (req, res) => {
    const data = await getDataFromDB(db, 'user_portfolios')
    res.send(data)
})

app.get('/market-prices', async (req, res) => {
    const data = await getDataFromDB(db, 'market_prices')
    res.send(data)
})

app.get('/order-book-buy', async (req, res) => {
    const data = await getDataFromDB(db, 'pending_buy_orders')
    res.send(data)
})

app.get('/order-book-sell', async (req, res) => {
    const data = await getDataFromDB(db, 'pending_sell_orders')
    res.send(data)
})

app.get('/transactions', async (req, res) => {
    const data = await getDataFromDB(db, 'transactions')
    res.send(data)
})

app.get('/get-all-data', async (req, res) => {

    const data = {}

    // get the user-data
    data['user_portfolios'] = await getDataFromDB(db, 'user_portfolios')
    // get the current-prices
    data['market_prices'] = await getDataFromDB(db, 'market_prices')
    // get the current-market-price
    // data['user_portfolios'] = await getDataFromDB(db, 'user_portfolios')
    // get the buy orders
    data['pending_buy_orders'] = await getDataFromDB(db, 'pending_buy_orders')
    // get the sell transactions
    data['pending_sell_orders'] = await getDataFromDB(db, 'pending_sell_orders')
    // get all the transactions
    data['transactions'] = await getDataFromDB(db, 'transactions')

    // const buyerFiat = await db.collection('user_portfolios').doc('A').get()
    // const buyerFiat = await (await db.collection('user_portfolios').doc('A').get()).data().fiat
    // console.log(buyerFiat)

    //  send the data
    res.send(data)

})


app.get('/buy', async (req, res) => {

    const { userId, orderType, stockAmount, price } = req.body

    // validate transaction possibility
    const buyerFiat = await db.collection('user_portfolios').doc(userId).get().data().fiat

    if (buyerFiat < (stockAmount * price)) {
        res.status(400).send('Insufficient fiat')
    }
    // add the transation to all-transactions
    // add the transaction to its buy table
    // current-price modify
    // add current price to current-prices database {cp, Date.now()}
    // update the portfolio

    res.send(200)

})

app.get('/sell', async (req, res) => {

    const { userId, orderType, stockAmount, price } = req.body

    // validate transaction possibility

    // add the transaction to its sell table
    // current-price modify
    // add current price to current-prices database {cp, Date.now()}
    // update the portfolio

    res.send(200)

})


const PORT = process.env.PORT || 8000

app.listen(PORT, () => {
    console.log(`Up and running at PORT ${PORT}`)
})