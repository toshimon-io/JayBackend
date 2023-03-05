// load up our shiny new route for users
const vaultRoutes = require('./vault');

const appRouter = (app, fs) => {
  // we've added in a default route here that handles empty routes
  // at the base API url
  app.get('/', (req, res) => {
    res.send('welcome to the development api-server');
  });

  // run our user route module here to complete the wire up
  vaultRoutes(app, fs);
};

// this line is unchanged
module.exports = vaultRoutes;