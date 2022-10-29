const getDataFromDB = async (db, collection_name, order_by = null) => {
    
    // console.log(collection_name)
    // console.log(order_by)


    const snapshot = await db.collection(collection_name).get();

    const data = []


    snapshot.forEach(doc => {
        // console.log(doc.data())
        const d = doc.data()
        d['id'] = doc.id
        data.push(d)
    })

    return data
    
}

module.exports.getDataFromDB = getDataFromDB