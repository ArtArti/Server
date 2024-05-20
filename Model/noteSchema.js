const { DataTypes } = require('sequelize');
const sequelize = require('../Database/database');
const { v4: uuidv4 } = require('uuid');
const User = require('../Models/User');

const Notes = sequelize.define('Notes', {
  id: {
    type: DataTypes.STRING(10),
    allowNull: false,
    primaryKey: true,
    defaultValue: () => {
      const prefix = 'f-notes-'; // First 6 characters
      const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0'); // Random 2-digit suffix
      return prefix + randomSuffix;
    },
  },
  userId: {
    type: DataTypes.STRING(10), // Match the data type with the 'id' column in the 'Users' table
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tag: {
    type: DataTypes.STRING,
    defaultValue: 'general',
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
  },
});

// Automatically create the table and synchronize with the database
Notes.sync({ force: false })
  .then(() => {
    console.log('notes table created and synchronized');
  })
  .catch((error) => {
    console.error('Error creating and synchronizing notes table:', error);
  });

  
module.exports = Notes;
