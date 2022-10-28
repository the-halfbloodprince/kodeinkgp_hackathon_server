const getDataFromDB = async (db, collection_name, options = null) => {
    
    const snapshot = await db.collection(collection_name).get()

    const data = []

    snapshot.forEach(doc => {
        data.push(doc.data())
    })

    return data
    
}

module.exports.getDataFromDB = getDataFromDB