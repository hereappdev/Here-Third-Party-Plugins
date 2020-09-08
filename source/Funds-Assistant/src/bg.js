// 获取小数点位数
const calcPos = (num) =>
  num.toString().indexOf('.') > -1 ? num.toString().split('.')[1].length : 0;
// 忽略小数点转为整数
const parseNum = (num) => parseInt(num.toString().replace('.', ''));

const FC = {
  // 加
  _add: (n1, n2) => {
    const p1 = calcPos(n1);
    const p2 = calcPos(n2);
    const m = Math.pow(10, Math.max(p1, p2));
    return (FC._mul(n1, m) + FC._mul(n2, m)) / m;
  },
  add: (...nums) => {
    let result = nums[0];
    for (let i = 1; i < nums.length; i++) result = FC._add(result, nums[i]);
    return result;
  },
  // 减
  _sub: (n1, n2) => FC.add(n1, -n2),
  sub: (...nums) => {
    let result = nums[0];
    for (let i = 1; i < nums.length; i++) result = FC._sub(result, nums[i]);
    return result;
  },
  // 乘
  _mul: (n1, n2) => {
    const p1 = calcPos(n1);
    const p2 = calcPos(n2);
    const m = Math.pow(10, p1 + p2);
    return (parseNum(n1) * parseNum(n2)) / m;
  },
  mul: (...nums) => {
    let result = nums[0];
    for (let i = 1; i < nums.length; i++) result = FC._mul(result, nums[i]);
    return result;
  },
  // 除
  _div: (n1, n2) => {
    const p1 = calcPos(n1);
    const p2 = calcPos(n2);
    const m = Math.pow(10, p2 - p1);
    return FC.mul(parseNum(n1) / parseNum(n2), m);
  },
  div: (...nums) => {
    let result = nums[0];
    for (let i = 1; i < nums.length; i++) result = FC._div(result, nums[i]);
    return result;
  },
};

const MAX = 50;
let config = {};

// 获取原始数据
function getData(cb) {
  const params = {
    pageIndex: 1,
    pageSize: MAX,
    plat: 'Android',
    appType: 'ttjj',
    product: 'EFund',
    Version: 1,
    deviceid: localStorage.getItem('deviceId'),
    Fcodes: localStorage.getItem('fundCode'),
  };
  if (!params.deviceid || !params.Fcodes) return;

  const paramsArr = [];
  for (let key in params) {
    if (key && params[key]) {
      paramsArr.push(`${key}=${params[key]}`);
    }
  }

  window
    .fetch(
      'https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?' +
        paramsArr.join('&'),
    )
    .then((res) => {
      if (res.status !== 200) {
        console.log('获取数据失败');
        return;
      }
      res.json().then(function(d) {
        cb(d);
      });
    });
}

// 数据落地
function dataHandle({ Expansion, Datas }) {
  // 持仓份额
  const fundAmount = localStorage.getItem('fundAmount')
    ? JSON.parse(localStorage.getItem('fundAmount'))
    : {};
  const dates = [Expansion.FSRQ.substr(5, 5), Expansion.GZTIME.substr(5, 5)];
  const fundData = [];
  for (let item of Datas)
    fundData.push({
      // 基金编号
      code: item.FCODE,
      // 基金名称
      name: item.SHORTNAME,
      // 前日净值
      jz: item.NAV,
      // 前日净值 涨跌
      jzL: item.NAVCHGRT,
      // 前日净值 时间
      jzDate:
        item.PDATE.substr(5, 5) === dates[0] ? '' : item.PDATE.substr(5, 5),

      // 今日估值
      gz: item.GSZ,
      // 今日估值 涨跌
      gzL: item.GSZZL,
      // 今日估值 时间
      gzDate:
        item.GZTIME.substr(5, 5) === dates[1] ? '' : item.GZTIME.substr(5, 5),

      // 是否更新今日净值
      isUpdated: item.PDATE.substr(5, 5) === item.GZTIME.substr(5, 5),
    });

  // 计算
  for (let fund of fundData) {
    // 持仓数量 <不变>
    fund.amount = fundAmount[fund.code] || 0;
    // 持仓金额
    fund.money = fund.isUpdated
      ? parseFloat(
          FC.div(
            FC.mul(fund.amount, fund.jz, 100),
            FC.add(100, fund.jzL),
          ).toFixed(2),
        )
      : parseFloat(FC.mul(fund.amount, fund.jz).toFixed(2));
    fund.moneyAfter = parseFloat(FC.mul(fund.amount, fund.jz).toFixed(2));
    // 收益
    fund.sy =
      // 无估值/持仓 基金不计算
      fund.gz == '--' || fund.amount === 0
        ? '--'
        : fund.isUpdated
        ? parseFloat(
            FC.sub(
              // 涨跌后金额
              FC.mul(fund.amount, fund.jz),
              // 涨跌前金额
              FC.div(FC.mul(fund.amount, fund.jz, 100), FC.add(100, fund.jzL)),
            ).toFixed(2),
          )
        : parseFloat(FC.mul(fund.amount, fund.jz, fund.gzL, 0.01).toFixed(2));
  }

  count(fundData);
}

function count(fundData) {
  let // 本金
    all = 0,
    allAfter = 0,
    // 已更新收益
    growthEd = 0,
    // 待更新收益
    growthWill = 0,
    // 总收益
    allGrowth = 0,
    // 总收益率
    allGrowthRate = 0;

  for (const fund of fundData) {
    all = FC.add(all, fund.money);
    allAfter = FC.add(allAfter, fund.moneyAfter);
    if (fund.sy === '--') continue;

    if (fund.isUpdated) growthEd = FC.add(growthEd, fund.sy);
    else growthWill = FC.add(growthWill, fund.sy);
    allGrowth = FC.add(allGrowth, fund.sy);
  }
  allGrowthRate = all
    ? parseFloat(FC.mul(FC.div(allGrowth, all), 100).toFixed(2))
    : 0;

  // 设置角标
  let allGrowthStr = parseInt(Math.abs(allGrowth)) + '';
  if (allGrowthStr.length > 4)
    allGrowthStr = parseInt(FC.div(Math.abs(allGrowth), 1000)) + 'k';
  chrome.browserAction.setBadgeText({
    text:
      config.showTip === 1
        ? allGrowthStr
        : Math.abs(allGrowthRate)
            .toFixed(2)
            .substr(0, 4),
  });
  chrome.browserAction.setBadgeBackgroundColor({
    color:
      allGrowth === 0
        ? [128, 128, 128, 255]
        : config.upIsRed
        ? allGrowth > 0
          ? [255, 77, 79, 255]
          : [82, 196, 26, 255]
        : allGrowth < 0
        ? [255, 77, 79, 255]
        : [82, 196, 26, 255],
  });
  // chrome.browserAction.setTitle({ title: '测试' });

  return { all, allAfter, growthEd, growthWill, allGrowth, allGrowthRate };
}

function init() {
  config = localStorage.getItem('config')
    ? JSON.parse(localStorage.getItem('config'))
    : {};

  if (config.showTip) getData(dataHandle);
  else
    chrome.browserAction.setBadgeText({
      text: '',
    });
}

init();
setInterval(init, 30 * 1000);
