# Repository Layer

- Repositories encapsulate all database access logic for specific entities. They provide a clean interface between business logic (routes, services) and the PostgreSQL database.
- This makes so that we don't have SQl code in any other files.
- Each table will have a repository class. Each repository class will expose function to insert, find and delete data
- Notice how there is no update. For now all tables are non updateable. This might change in the future.

### Main methods supported
#### Insert
```js
userRepository.insertUser(userObject);
// The userObject will be a object containing key : value pairs of the fields you want to insert in the the DB
```
#### Find
```js   
userRepository.findUser(field : string, value : any);
// field is the filed in the table you want to search against
// value is the value of that field. Basically only supports equality searches for now
```

#### Delete
```js
userRepository.deleteUser(field : string, value : any);
// This will mark the isDeleted of the user to be true
// field nad value work as findUser
```
