# About db-assist
A tiny tool for importing & exporting data for developer & tester through Excel file. Why? Because it is simple to create an Excel data file and discuss among team members and it is also easy to update the data.

## Important
I create this tool to use in development environment only, NOT in production environment. Please take care of that!

## Prerequisites
1. NodeJS
2. Typescript

### Oracle client (only for Oracle database)
1. Download Oracle client: https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html
2. Unzip to a folder
3. Set system path variables to the folder
Should follow this guideline at https://docs.oracle.com/en/database/oracle/r-enterprise/1.5.1/oread/installing-oracle-database-instant-client.html

## Installation
1. Install NodeJS
2. Install ts-node for typescript: npm i -g ts-node
3. Go to project folder and run: npm install

## Instruction

### How db-assist works?
1. Only reads the first sheet in Excel file ans the sheet name is used as table name. Don't combine multiple tables into multiple Excel sheets that causes big Excel file.
2. Connects to database to get columns of the table and map the first row in Excel sheet with columns it found
3. The first row is used to lookup for table names, then map each data row in the Excel sheet
4. Reads data row from the 3rd row. The 2nd row is reversed for column description.

### Normal cell values
1. Type of a cell value depends on the same column type that is described in its database table
2. Empty cell is considered as null value

### Special cell values
1. Special value is started with **:=** assignment prefix
2. db-assist can run a SELECT command to lookup data for a column. For example, **:=SELECT user_name FROM User where user_id = 1**
3. INSERT/UPDATE commands are not allowed
4. Some custom functions to help generate random data
  - **randomBool**: generates random boolean (true/false) values
  - **randomInt(min, max)**: generates random interger in a range of [min, max]
  - **randomDecimal(min, max, fractionDigits)**: generates random decimal in a range of [min, max]
  - **randomFloat(min, max, fractionDigits)**: same as randomDecimal
  - **randomChars(length)**: generates a random string with fixed length
5. Others are considered as database's functions or values. For example, **:=null** (insert null), **:=sysdate** (insert date for Oracle), etc.

Please check test folder for examples.
