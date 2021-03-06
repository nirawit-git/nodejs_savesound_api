module.exports = {
    doLogin(db, username, password) {
        return db('users')
            .select('username', 'email', 'id')
            .where('username', username)
            .where('password', password)
            .limit(1);
    },

    getList(db) {
        return db('users').orderBy('id');
    },

    save(db, data) {
        return db('users').insert(data, 'id');
    },

    update(db, id, data) {
        return db('users')
            .where('id', id)
            .update(data);
    },

    remove(db, id) {
        return db('users')
            .where('id', id)
            .del();
    },

    getInfo(db, id) {
        return db('users')
            .where('id', id);
    },
    getSound(db, text) {
        return db('sound')
            .where('sound_text', text)
            .where('status', 1)
    },
    saveSound(db, data) {
        return db('sound').returning('id').insert(data);
    }

};