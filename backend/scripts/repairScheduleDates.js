const dotenv=require('dotenv');
dotenv.config({quiet:true});
const mongoose=require('mongoose');
const connectDB=require('../config/db');
const {repairStartDateBounds}=require('../services/scheduleRepairService');
(async()=>{await connectDB();if(mongoose.connection.readyState!==1) throw new Error('Database connection unavailable.');const result=await repairStartDateBounds({apply:process.argv.includes('--apply')});console.log(JSON.stringify(result));await mongoose.disconnect();})().catch(async error=>{console.error('Schedule date repair failed: '+error.message);await mongoose.disconnect().catch(()=>{});process.exit(1);});