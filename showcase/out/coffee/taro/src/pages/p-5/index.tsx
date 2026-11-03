import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function PageP5() {
  return (
    <View id="page-275" className="page-1">
      <View className="frame-1">
        <View className="frame-2">
          <Text className="text-1">{"我的订单"}</Text>
          <View className="rectangle-1"></View>
        </View>
        <Text className="text-2">{"拾豆咖啡 · 望京 SOHO 店"}</Text>
      </View>
      <View className="frame-3">
        <View className="frame-4">
          <Text className="text-3">{"全部"}</Text>
        </View>
        <View className="frame-5">
          <Text className="text-4">{"进行中"}</Text>
        </View>
        <View className="frame-6">
          <Text className="text-5">{"已完成"}</Text>
        </View>
        <View className="frame-7">
          <Text className="text-6">{"已取消"}</Text>
        </View>
      </View>
      <View className="frame-8">
        <View className="frame-9">
          <View className="frame-10">
            <Text className="text-7">{"制作中"}</Text>
            <View className="frame-11">
              <Text className="text-8">{"约 8 分钟后"}</Text>
            </View>
          </View>
          <View className="frame-12">
            <Text className="text-9">{"取餐码"}</Text>
            <Text className="text-10">{"A26"}</Text>
            <Text className="text-11">{"请凭码到吧台取餐"}</Text>
          </View>
          <View className="rectangle-2"></View>
          <View className="frame-13">
            <View className="frame-14">
              <Text className="text-12">{"#S20240612-0087"}</Text>
              <Text className="text-13">{"14:52"}</Text>
            </View>
            <Text className="text-14">{"望京 SOHO 店"}</Text>
            <Text className="text-15">{"燕麦拿铁 大杯·热 等 2 件"}</Text>
            <View className="frame-15">
              <Text className="text-16">{"合计"}</Text>
              <Text className="text-17">{"¥73.00"}</Text>
            </View>
          </View>
        </View>
        <View className="frame-16">
          <View className="frame-17">
            <Text className="text-18">{"#S20240611-0052"}</Text>
            <Text className="text-19">{"已完成"}</Text>
          </View>
          <View className="frame-18">
            <Text className="text-20">{"06-11 09:20"}</Text>
            <Text className="text-21">{"望京 SOHO 店"}</Text>
          </View>
          <Text className="text-22">{"冰摇柠檬美式 大杯·冰 等 1 件"}</Text>
          <View className="rectangle-3"></View>
          <View className="frame-19">
            <Text className="text-23">{"合计"}</Text>
            <Text className="text-24">{"¥42.00"}</Text>
          </View>
        </View>
        <View className="frame-20">
          <View className="frame-21">
            <Text className="text-25">{"#S20240610-0031"}</Text>
            <Text className="text-26">{"已完成"}</Text>
          </View>
          <View className="frame-22">
            <Text className="text-27">{"06-10 16:05"}</Text>
            <Text className="text-28">{"望京 SOHO 店"}</Text>
          </View>
          <Text className="text-29">{"海盐焦糖玛奇朵 中杯·热 等 3 件"}</Text>
          <View className="rectangle-4"></View>
          <View className="frame-23">
            <Text className="text-30">{"合计"}</Text>
            <Text className="text-31">{"¥96.00"}</Text>
          </View>
        </View>
        <View className="frame-24">
          <View className="frame-25">
            <Text className="text-32">{"#S20240608-0019"}</Text>
            <Text className="text-33">{"已取消"}</Text>
          </View>
          <View className="frame-26">
            <Text className="text-34">{"06-08 12:40"}</Text>
            <Text className="text-35">{"望京 SOHO 店"}</Text>
          </View>
          <Text className="text-36">{"燕麦拿铁 中杯·热 等 2 件"}</Text>
          <View className="rectangle-5"></View>
          <View className="frame-27">
            <Text className="text-37">{"合计"}</Text>
            <Text className="text-38">{"¥58.00"}</Text>
          </View>
        </View>
      </View>
      <View className="frame-28">
        <View className="frame-29" onClick={() => { Taro.reLaunch({ url: "/pages/p-1/index" }) }}>
          <svg className="vector-1" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#b5654a" strokeWidth="2" ><path d="M10 2v2M14 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1M6 2v2" /></svg>
          <Text className="text-39">{"点单"}</Text>
        </View>
        <View className="frame-30">
          <svg className="vector-2" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#7a6350" strokeWidth="2" ><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11" /></svg>
          <Text className="text-40">{"订单"}</Text>
        </View>
        <View className="frame-31" onClick={() => { Taro.reLaunch({ url: "/pages/p-6/index" }) }}>
          <svg className="vector-3" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#b5654a" strokeWidth="2" ><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M8 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /></svg>
          <Text className="text-41">{"我的"}</Text>
        </View>
      </View>
    </View>
  )
}
