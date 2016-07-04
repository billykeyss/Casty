echo "Welcome to Casty 3! \n\n\n"

echo "Retrieving Npm packages \n"
npm install

echo "Performing any upgrades (just in case)... \n"
node InitDynamoDB/CreateMovieListTable.js

echo "Please visit http://localhost:3000/movie-list or http://ip-to-your-computer:3000/movie-list"
node picast.js
