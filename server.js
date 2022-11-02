require('dotenv').config()
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
const cors = require('cors');
const serviceAccountCredentials = require('./service_account_credentials.json');

const app = express();

initializeApp({
	credential: cert(serviceAccountCredentials),
});

const db = getFirestore();

app.use(express.json());
app.use(
	cors({
		origin: process.env.CLIENT_URL,
	})
);

app.get('/adduser', async (req, res) => {
	const users = getUsersFromDB(db)
	validate(users)
})

// app.get('/', async (req, res) => {
// 	const x = await db.collection('user_portfolios').get()
// 	console.log(x.fo)
// 	res.send('noic')
// })

// req = {
//     fields_needed: ['users-portfolio', 'current-market-price']
// }

app.get('/reset-users', async (req, res) => {
	await resetUsers(db);
	res.send({
		error: true,
	});
});

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
	// console.log(req.body);

	let { user_id, order_type, quantity, price } = req.body;

	// validate transaction possibility
	const bu = await db.collection('user_portfolios').doc(user_id).get();

	let buyerFiat = bu.data().fiat;
	if (buyerFiat < quantity * price) {
		return res.status(401).send("Don't have sufficient fund");
	}
	const resArray = await db.collection('pending_sell_orders').orderBy('price').get();
	const allSell = [];
	resArray.forEach((sell) => {
		allSell.push({ id: sell.id, data: sell.data() });
	});
	const toDeleteIds = [];
	
		
	let i = 0;
	let stocksAddedToBuyer = 0;

	while (i < allSell.length && quantity > 0) {
		if (order_type ==='Limit' && price < allSell[i].data.price)
		{
			break;
		}
		let canProvideStock = allSell[i].data.quantity;

		let minQuantity = Math.min(quantity, canProvideStock);
		const sellerRef = await db
				.collection('user_portfolios')
				.doc(allSell[i].data.user);

		const sellerData = await sellerRef.get();
		if (sellerData.id === user_id) {
			i++;
			continue;
		}
		const sellOrderRef = await db
			.collection('pending_sell_orders')
			.doc(allSell[i].id);

		const sellOrderData = await sellOrderRef.get();
		console.log(sellOrderData.data());
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

			sellOrderRef.update({
				quantity: sellOrderData.data().quantity - canTake,
			});
			if (canTake > 0) {
				await db.collection('market_prices').add({
					datetime: FieldValue.serverTimestamp(),
					price: allSell[i].data.price,
				});
			}

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
			let sellOrderLeft = sellOrderData.data().quantity-minQuantity
			if ( sellOrderLeft=== 0) {
				toDeleteIds.push(allSell[i].id);
			} else {
				sellOrderRef.update({
					quantity: sellOrderLeft,
				});
			}

			if (minQuantity > 0) {
				await db.collection('market_prices').add({
					datetime: FieldValue.serverTimestamp(),
					price: allSell[i].data.price,
				});
				await db.collection('transactions').add({
					seller: allSell[i].data.user,
					buyer: user_id,
					price: allSell[i].data.price,
					quantity: minQuantity,
					datetime: FieldValue.serverTimestamp(),
				});
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
	// console.log(toDeleteIds);
	toDeleteIds.forEach(async (id) => {
		const resDelete = await db.collection('pending_sell_orders').doc(id).delete();
	});
	if (order_type === "Limit" && quantity > 0)
	{
		const newOrder = await db.collection('pending_buy_orders').add({
			user: user_id,
			quantity: quantity,
			price: price,
			datetime: FieldValue.serverTimestamp(),
		});
	}
	return res.send('noice');
});

app.post('/sell', async (req, res) => {
	let { user_id, order_type, quantity, price } = req.body;

	// validate transaction possibility
	const sl = await db.collection('user_portfolios').doc(user_id).get();

	let availableStocks = sl.data().stocks;

	if (availableStocks < quantity) {
		return res.status(402).send('Not enough Stocks to sell.');
	}

	// if (order_type === 'Limit') {
	// 	const newOrder = await db.collection('pending_sell_orders').add({
	// 		user: user_id,
	// 		quantity: quantity,
	// 		price: price,
	// 		datetime: FieldValue.serverTimestamp(),
	// 	});
	// 	console.log(newOrder.id);
	// } else {
	const resArray = await db
		.collection('pending_buy_orders')
		.orderBy('price')
		.get();
	const allBuy = [];
	resArray.forEach((buy) => {
		allBuy.push({ id: buy.id, data: buy.data() });
	});
	const toDeleteIds = [];
	let i = allBuy.length - 1;
	let stocksSubFromSeller = 0;
	let moneyAddedToSeller = 0;

	while (i >= 0 && quantity > 0) {
		if (order_type ==='Limit' && price > allBuy[i].data.price)
		{
			break;
		}
		let canTakeStock = allBuy[i].data.quantity;

		let minQuantity = Math.min(quantity, canTakeStock);
		const buyerRef = await db
			.collection('user_portfolios')
			.doc(allBuy[i].data.user);

		const buyerData = await buyerRef.get();
		if (buyerData.id === user_id) {
			i--;
			continue;
		}
		const buyOrderRef = await db
			.collection('pending_buy_orders')
			.doc(allBuy[i].id);

		const buyOrderData = await buyOrderRef.get();
		console.log(buyOrderData.data());
		buyerRef.update({
			// give money to seller
			fiat: buyerData.data().fiat - minQuantity * allBuy[i].data.price,
			// decrease stocks
			stocks: buyerData.data().stocks + minQuantity,
		});
		moneyAddedToSeller += minQuantity * allBuy[i].data.price;
		stocksSubFromSeller += minQuantity;
		quantity -= minQuantity;
		if (canTakeStock === minQuantity) {
			toDeleteIds.push(allBuy[i].id);
		}
		if (minQuantity > 0) {
			await db.collection('market_prices').add({
				datetime: FieldValue.serverTimestamp(),
				price: allBuy[i].data.price,
			});
			await db.collection('transactions').add({
				buyer: allBuy[i].data.user,
				seller: user_id,
				price: allBuy[i].data.price,
				quantity: minQuantity,
				datetime: FieldValue.serverTimestamp(),
			});
			if (canTakeStock !== minQuantity)
			{
				buyOrderRef.update({
					quantity: buyOrderData.data().quantity - minQuantity,
				});
			}
			
		}

		i--;
	}

	const sellerRef = await db.collection('user_portfolios').doc(user_id);
	const sellerData = await sellerRef.get();
	sellerRef.update({
		fiat: sellerData.data().fiat + moneyAddedToSeller,
		stocks: sellerData.data().stocks - stocksSubFromSeller,
	});
	// console.log(toDeleteIds);
	toDeleteIds.forEach(async (id) => {
		const res = await db.collection('pending_buy_orders').doc(id).delete();
	});
	if (quantity > 0 && order_type === 'Limit')
	{
		const newOrder = await db.collection('pending_sell_orders').add({
			user: user_id,
			quantity: quantity,
			price: price,
			datetime: FieldValue.serverTimestamp(),
		});
	}

	return res.send('noice');
});

app.post('/add_user', async (req, res) => {
	let { name, fiat, stocks } = req.body;
	console.log(name);
	const cr = await db.collection('user_portfolios').add({
		user_name: name,
		stocks: stocks,
		fiat: fiat,
	});
	// console.log(cr.id)
	return res.send(cr.id);
});

app.post('/update_user', async (req, res) => {
	let { id, fiat, stocks } = req.body;
	// console.log(name);
	const cr = await db.collection('user_portfolios').doc(id).update({
		stocks: stocks,
		fiat: fiat,
	});
	// console.log(cr.id)
	return res.send('ok');
});

const modifyAll = () => {
	
}

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
	console.log(`Up and running at PORT ${PORT}`);
});
