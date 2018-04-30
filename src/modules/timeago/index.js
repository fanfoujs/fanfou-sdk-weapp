'use strict'

const i18n = require('./i18n/index')
const timeago = require('./timeago')

const fanfouWeAppDict = function (number, index) {
  return i18n.timeago[index]
}

timeago.register('fanfou_weapp', fanfouWeAppDict)

module.exports = timeago
