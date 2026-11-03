import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function PageP1() {
  return (
    <View id="page-1" className="page-1">
      <View className="frame-1">
        <View className="frame-2">
          <Text className="text-1">{"11 月"}</Text>
          <svg className="vector-1" width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#64748b" strokeWidth="4" ><path d="m6 9 6 6 6-6" /></svg>
        </View>
        <Text className="text-2">{"青柠账本"}</Text>
      </View>
      <View className="frame-3">
        <Text className="text-3">{"本月支出"}</Text>
        <Text className="text-4">{"¥4,286.50"}</Text>
        <View className="frame-4"></View>
        <View className="frame-5">
          <View className="frame-6">
            <Text className="text-5">{"收入"}</Text>
            <Text className="text-6">{"¥12,800.00"}</Text>
          </View>
          <View className="frame-7">
            <Text className="text-7">{"结余"}</Text>
            <Text className="text-8">{"¥8,513.50"}</Text>
          </View>
        </View>
      </View>
      <View className="frame-8">
        <View className="frame-9">
          <Text className="text-9">{"本月预算"}</Text>
          <Text className="text-10">{"71%"}</Text>
        </View>
        <Text className="text-11">{"已用 ¥4,286.50 / 总额 ¥6,000.00"}</Text>
        <View className="frame-10">
          <View className="rectangle-1"></View>
        </View>
        <View className="frame-11">
          <View className="rectangle-2"></View>
        </View>
      </View>
      <View className="frame-12">
        <View className="frame-13" onClick={() => { Taro.reLaunch({ url: "/pages/p-2/index" }) }}>
          <Text className="text-12">{"最近三笔"}</Text>
          <Text className="text-13">{"全部明细"}</Text>
        </View>
        <View className="frame-14">
          <View className="frame-15">
            <svg className="vector-2" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#0f5132" strokeWidth="3" ><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></svg>
          </View>
          <View className="frame-16">
            <Text className="text-14">{"餐饮"}</Text>
            <Text className="text-15">{"楼下面馆"}</Text>
          </View>
          <View className="frame-17">
            <Text className="text-16">{"¥38.00"}</Text>
            <Text className="text-17">{"11-28"}</Text>
          </View>
        </View>
        <View className="frame-18">
          <View className="frame-19">
            <svg className="vector-3" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#0f5132" strokeWidth="3" ><path d="M8 6v6M15 6v6M2 12h19.6M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3M5 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M9 18h5M14 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /></svg>
          </View>
          <View className="frame-20">
            <Text className="text-18">{"交通"}</Text>
            <Text className="text-19">{"地铁2号线"}</Text>
          </View>
          <View className="frame-21">
            <Text className="text-20">{"¥6.00"}</Text>
            <Text className="text-21">{"11-28"}</Text>
          </View>
        </View>
        <View className="frame-22">
          <View className="frame-23">
            <svg className="vector-4" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#0f5132" strokeWidth="3" ><path d="M10 2v2M14 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1M6 2v2" /></svg>
          </View>
          <View className="frame-24">
            <Text className="text-22">{"购物"}</Text>
            <Text className="text-23">{"咖啡续命"}</Text>
          </View>
          <View className="frame-25">
            <Text className="text-24">{"¥28.00"}</Text>
            <Text className="text-25">{"11-27"}</Text>
          </View>
        </View>
        <View className="frame-26">
          <View className="frame-27">
            <svg className="vector-5" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#0f5132" strokeWidth="3" ><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zM12 22V12m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7m7.5 4.27 9 5.15" /></svg>
          </View>
          <View className="frame-28">
            <Text className="text-26">{"居家"}</Text>
            <Text className="text-27">{"宜家收纳盒"}</Text>
          </View>
          <View className="frame-29">
            <Text className="text-28">{"¥129.00"}</Text>
            <Text className="text-29">{"11-26"}</Text>
          </View>
        </View>
        <View className="frame-30">
          <View className="frame-31">
            <svg className="vector-6" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#0f5132" strokeWidth="3" ><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2ZM13 5v2M13 17v2M13 11v2" /></svg>
          </View>
          <View className="frame-32">
            <Text className="text-30">{"娱乐"}</Text>
            <Text className="text-31">{"电影票两张"}</Text>
          </View>
          <View className="frame-33">
            <Text className="text-32">{"¥76.00"}</Text>
            <Text className="text-33">{"11-26"}</Text>
          </View>
        </View>
      </View>
      <View className="frame-34" onClick={() => { Taro.navigateTo({ url: "/pages/p-3/index" }) }}>
        <Button className="button-1">{"记一笔"}</Button>
      </View>
      <View className="frame-35">
        <View className="frame-36">
          <svg className="vector-7" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#0f5132" strokeWidth="2.4" ><path d="M4 3h5a1 1 0 0 1 1 1v7a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1ZM15 3h5a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1ZM15 12h5a1 1 0 0 1 1 1v7a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1ZM4 16h5a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-5a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1Z" /></svg>
          <Text className="text-34">{"概览"}</Text>
        </View>
        <View className="frame-37" onClick={() => { Taro.reLaunch({ url: "/pages/p-2/index" }) }}>
          <svg className="vector-8" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#64748b" strokeWidth="2.4" ><path d="M3 12h.01M3 18h.01M3 6h.01M8 12h13M8 18h13M8 6h13" /></svg>
          <Text className="text-35">{"明细"}</Text>
        </View>
        <View className="frame-38" onClick={() => { Taro.reLaunch({ url: "/pages/p-6/index" }) }}>
          <svg className="vector-9" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#64748b" strokeWidth="2.4" ><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M8 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /></svg>
          <Text className="text-36">{"我的"}</Text>
        </View>
      </View>
    </View>
  )
}
