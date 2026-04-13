# Use official Node.js image (Alpine for small size)
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# Wildcard ensures both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install --only=production

# Bundle app source
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Run the application
CMD [ "node", "app.js" ]
