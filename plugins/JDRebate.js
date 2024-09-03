/**
 * 京东商品返利插件
 * @author dinding
 * @team dinding
 * @name JDRebate
 * @platform wxKv
 * @version 1.0.0
 * @description 京东商品返利插件
 * @rule [\s\S]*https?://([^\s]+\.)?(jd\.com|m.jd.com|3\.cn|item.jd.com|item.m.jd.com|jingfen.jd.com|mitem.jd.hk|kpl.m.jd.com|u.jd.com|item.yiyaojd.com)[^\s]*
 * @admin false
 * @public true
 * @priority 99999
 * @disable false
 * @classification ["京东返利插件"]
 */
//关键参数配置

const jsonSchema1 = BncrCreateSchema.object({
  appid: BncrCreateSchema.string().setTitle('Appid').setDescription('').setDefault('京品库申请的Appid'),
  appkey: BncrCreateSchema.string().setTitle('Appkey').setDescription('').setDefault('京品库申请的Appkey'),
  union_id: BncrCreateSchema.string().setTitle('联盟ID').setDescription('').setDefault('京东联盟的联盟ID'),
}).setTitle('京东返利插件配置').setDescription('').setDefault({});

const ConfigDB = new BncrPluginConfig(jsonSchema1);
/**
 * 插件入口，插件被触发时将运行该 function
 * @param {Sender} sender
 */

module.exports = async sender => {
  const message = sender.getMsg(); // 获取消息内容

 /*                      使用正则表达式提取消息中链接                      */ 
  const urlPattern = /(https?:\/\/([^\s]+\.)?(jd\.com|m.jd.com|3\.cn|item.jd.com|item.m.jd.com|jingfen.jd.com|mitem.jd.hk|kpl.m.jd.com|u.jd.com|item.yiyaojd.com)[^\s]*)/;
  const match = message.match(urlPattern);
  const jdurl = match ? match[0] : '';
  if (!jdurl) {
    return await sender.reply('商品不在推广范围');
  }

 /*                      以下接口京东商品转链信息                      */ 
  const apiUrl = 'https://api.jingpinku.com/get_atip_link/api'; // 线报转链接口
  const params = {
    appid: ConfigDB.userConfig.appid,
    appkey: ConfigDB.userConfig.appkey,
    union_id: ConfigDB.userConfig.union_id,
  };
  const requestUrl = apiUrl + '?' + new URLSearchParams(params) + '&content=' + jdurl;
  console.log('API 请求 URL:', requestUrl);
  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log('响应状态码:', response.status);
    const data = await response.json();
    console.log('API 返回的数据:', data);
    if (data.err) {
      return await sender.reply(`转链失败: ${data.err}`);
    }
    // 仅提取 images 数组中的第一条链接
    let imageUrl = '无';
    if (data.images && data.images.length > 0) {
      imageUrl = data.images[0];
      data.images = [imageUrl];
    } else {
      data.images = [];
    }

    // 提取 official 链接
    const officialUrlMatch = data.official.match(/https?:\/\/[^\s]+/);
    const officialUrl = officialUrlMatch ? officialUrlMatch[0] : '无';
    
    if (officialUrl === '无') {
      return await sender.reply('商品不在推广范围');
    }

    
/*                      以下接口获取佣金信息                      */
    const apiUrl2 = 'https://api.jingpinku.com/get_union_search_concise/api'; // 关键词精简版接口
    const price = {
      appid: ConfigDB.userConfig.appid,
      appkey: ConfigDB.userConfig.appkey,
    };
    const requestUrl2 = apiUrl2 + '?' + new URLSearchParams(price) + '&pageIndex=1&keyword=' + encodeURIComponent(officialUrl);
    console.log('API 请求 URL:', requestUrl2);
    try {
      const response2 = await fetch(requestUrl2, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('响应状态码:', response2.status);
      const data2 = await response2.json();
      if (data2.code !== '0' || !data2.data || data2.data.length === 0) {
        return await sender.reply('未能获取商品信息');
      }
      const product = data2.data[0]; // 获取第一个商品信息

      const productInfo = {
        商品信息: product.sku_name || '无',
        商品好评: product.goods_comments_share || '0',       
        商品原价: product.price || '无',
        卷后价格: product.lowest_coupon_price || '无',
        预估佣金: product.commission || '0',
        优惠卷金额: product.coupon_discount || '暂无优惠',        
        优惠卷链接: product.coupon_list && product.coupon_list.length > 0 ? product.coupon_list[0].link : '暂无优惠卷',
        图片链接: product.image_url || '无',
      };
            // 修改后的回复内容
      const modifiedResponse = {
        ...data2,
        秒杀链接: officialUrl,
      };

      // 格式化回复消息
      const replyMessage = `
【京东】 ${productInfo.商品信息}

商品好评: ${productInfo.商品好评}%
商品原价: ${productInfo.商品原价}
卷后价格: ${productInfo.卷后价格}
预估佣金: ${productInfo.预估佣金}
优惠卷金额: ${productInfo.优惠卷金额}

↓↓↓↓↓↓↓↓↓
秒杀链接: ${officialUrl}
      `;

      // 发送文本消息
      await sender.reply(replyMessage.trim());

      // 发送图片消息
      if (imageUrl !== '无') {
        await sender.reply({
          type: 'image', 
          path: imageUrl,
        });
      }

    } catch (error) {
      console.error('第二个 API 请求出错:', error);
      return await sender.reply('获取商品信息失败，请稍后再试');
    }
  } catch (error) {
    console.error('第一个 API 请求出错:', error);
    return await sender.reply('转链失败，请稍后再试');
  }
};