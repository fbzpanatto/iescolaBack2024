// export default (date: Date) => {
//   const dateWithTimeZone = new Date(date)
//   const dateInUTC = new Date(dateWithTimeZone.getTime() + dateWithTimeZone.getTimezoneOffset() * 60000)
//   const miliseconds = dateInUTC.getTime() + (dateInUTC.getTimezoneOffset() * 60000)
//   return 1
// }

export default (date: Date) => {
  return new Date(date).getTime();
}

