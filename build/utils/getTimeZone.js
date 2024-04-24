"use strict";
// export default (date: Date) => {
//   const dateWithTimeZone = new Date(date)
//   const dateInUTC = new Date(dateWithTimeZone.getTime() + dateWithTimeZone.getTimezoneOffset() * 60000)
//   const miliseconds = dateInUTC.getTime() + (dateInUTC.getTimezoneOffset() * 60000)
//   return 1
// }
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (date) => {
    return new Date(date).getTime();
};
