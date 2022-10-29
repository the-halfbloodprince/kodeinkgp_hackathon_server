const express = require('express');
const {
	initializeApp,
	applicationDefault,
	cert,
} = require('firebase-admin/app');
const {
	getFirestore,
	Timestamp,
	FieldValue,
} = require('firebase-admin/firestore');
const { getDataFromDB } = require('./utils');
const resetUsers = require('./reset_users');

const serviceAccountCredentials = require('./service_account_credentials.json');

const app = express();

initializeApp({
	credential: cert(serviceAccountCredentials),
});

const db = getFirestore();

app.use(express.json());

// req = {
//     fields_needed: ['users-portfolio', 'current-market-price']
// }

// app.get('/reset-users', async (req, res) => {
//     await resetUsers(db)
// })

app.get('/user-portfolios', async (req, res) => {
	const data = await getDataFromDB(db, 'user_portfolios');
	res.send(data);
});

app.get('/market-prices', async (req, res) => {
	const data = await getDataFromDB(db, 'market_prices');
	res.send(data);
});

app.get('/order-book-buy', async (req, res) => {
	const data = await getDataFromDB(db, 'pending_buy_orders');
	res.send(data);
});

app.get('/order-book-sell', async (req, res) => {
	const data = await getDataFromDB(db, 'pending_sell_orders');
	res.send(data);
});

app.get('/transactions', async (req, res) => {
	const data = await getDataFromDB(db, 'transactions');
	res.send(data);
});

// app.get('/transactions', async (req, res) => {                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            et('/transactions', async (req, res) => {
//     const data = await getDataFromDB(db, 'transactions')
//     res.send(data)
// })

app.get('/get-all-data', async (req, res) => {
	const data = {};

	// get the user-data
	data['user_portfolios'] = await getDataFromDB(db, 'user_portfolios');
	// get the current-prices
	data['market_prices'] = await getDataFromDB(db, 'market_prices');
	// get the current-market- price
	// data ['user_portfolios'] = await getDataFromDB(db, 'user_portfolios')
	// get the buy orders
	data['pending_buy_orders'] = await getDataFromDB(db, 'pending_buy_orders');
	// get the sell transactions
	data['pending_sell_orders'] = await getDataFromDB(db, 'pending_sell_orders');
	// get all the transactions
	data['transactions'] = await getDataFromDB(db, 'transactions');

	// const buyerFiat = await db.collection('user_portfolios').doc('A').get()
	// const buyerFiat = await (await db.collection('user_portfolios').doc('A').get()).data().fiat
	// console.log(buyerFiat)

	//  send the data
	res.send(data);
});

app.post('/buy', async (req, res) => {
	console.log(req.body);

	let { user_id, order_type, quantity, price } = req.body;

	// validate transaction possibility
	const ss = await db.collection('user_portfolios').doc(user_id).get();

	let buyerFiat = ss.data().fiat;
    
	// if (buyerFiat < quantity * price) {
	// 	return res.status(400).send('Insufficient fiat');
	// }

	if (order_type === 'Limit') {
		const newOrder = await db.collection('pending_buy_orders').add({
			user: user_id,
			quantity: quantity,
			price: price,
			datetime: FieldValue.serverTimestamp(),
		});
		console.log(newOrder.id);
	} else {
		const res = await db
			.collection('pending_sell_orders')
			.orderBy('price')
			.get();
		const allSell = [];
		res.forEach((sell) => {
			allSell.push({ id: sell.id, data: sell.data() });
		});
		const toDeleteIds = [];
		let i = 0;
		const bu = await db.collection('user_portfolios').doc(user_id).get();
		let buyerFiat = bu.data().fiat;
		let stocksAddedToBuyer = 0;

		while (i < allSell.length && quantity > 0) {
			let canProvideStock = allSell[i].data.quantity;

			let minQuantity = Math.min(quantity, canProvideStock);
			const sellerRef = await db
				.collection('user_portfolios')
				.doc(allSell[i].data.user);

            const sellerData = await sellerRef.get();
            if (sellerData.id === user_id)
            {
                i++;
                continue;

            }
                
			if (minQuantity * allSell[i].data.price > buyerFiat) {
				let canTake = Math.floor(buyerFiat / allSell[i].data.price);
				buyerFiat -= canTake * allSell[i].data.price;
				sellerRef.update({
					// give money to seller
					fiat: sellerData.data().fiat + canTake * allSell[i].data.price,
					// decrease stocks
					stocks: sellerData.data().stocks - canTake,
				});

				// add stocks gained to buyer
				stocksAddedToBuyer += canTake;

				// update quantity of loop
				quantity -= canTake;

				// end
				break;
			} else {
				// subtract price from buyerFiat
				buyerFiat -= minQuantity * allSell[i].data.price;
				let sellerStocksleft = sellerData.data().stocks - minQuantity;
				sellerRef.update({
					// give money to seller
					fiat: sellerData.data().fiat + minQuantity * allSell[i].data.price,
					// decrease stocks
					stocks: sellerStocksleft,
				});
				// add stocks gained to buyer
				stocksAddedToBuyer += minQuantity;

				// update quantity
				quantity -= minQuantity;

				//add sell to delete if he is sold completely

				if (sellerStocksleft === 0) {
					toDeleteIds.push(allSell[i].id);
				}
			}
			i++;
		}

		const buyerRef = await db.collection('user_portfolios').doc(user_id);
		const buyerData = await buyerRef.get();
		buyerRef.update({
			fiat: buyerFiat,
			stocks: buyerData.data().stocks + stocksAddedToBuyer,
		});
        console.log(toDeleteIds)
		toDeleteIds.forEach(async (id) => {
			const res = await db.collection('pending_sell_orders').doc(id).delete();
		});
	}

	return res.send('noic');
});

app.get('/sell', async (req, res) => {
	const { userId, order_type, stockAmount, price } = req.body;

	// validate transaction possibility
	const ss = await db.collection('user_portfolios').doc();

	res.send(200);
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
	console.log(`Up and running at PORT ${PORT}`);
});
