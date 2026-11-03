import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function PageP2() {
  return (
    <View id="page-507" className="page-1">
      <View className="frame-1">
        <View className="frame-2">
          <svg className="vector-1" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#b5654a" strokeWidth="2.4" ><path d="m15 18-6-6 6-6" /></svg>
        </View>
        <Text className="text-1">{"拾豆咖啡"}</Text>
        <Button className="button-1">{"下一步"}</Button>
      </View>
      <View className="frame-3">
        <View className="frame-4">
          <View className="frame-5">
            <svg className="vector-2" width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#b5654a" strokeWidth="1" ><path d="M10 2v2M14 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1M6 2v2" /></svg>
          </View>
        </View>
      </View>
      <View className="frame-6">
        <Text className="text-2">{"燕麦拿铁"}</Text>
        <Text className="text-3">{"OAT LATTE"}</Text>
        <View className="frame-7">
          <Text className="text-4">{"¥32.00"}</Text>
          <Text className="text-5">{"中杯 473ml · 使用燕麦奶"}</Text>
        </View>
      </View>
      <View className="rectangle-1"></View>
      <View className="frame-8">
        <Text className="text-6">{"杯型"}</Text>
        <View className="frame-9">
          <View className="frame-10">
            <Text className="text-7">{"中杯"}</Text>
            <Text className="text-8">{"473ml"}</Text>
          </View>
          <View className="frame-11">
            <Text className="text-9">{"大杯"}</Text>
            <Text className="text-10">{"591ml"}</Text>
          </View>
          <View className="frame-12">
            <Text className="text-11">{"超大杯"}</Text>
            <Text className="text-12">{"709ml"}</Text>
          </View>
        </View>
      </View>
      <View className="frame-13">
        <Text className="text-13">{"温度"}</Text>
        <View className="frame-14">
          <View className="frame-15">
            <svg className="vector-3" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#faf5ef" strokeWidth="3" ><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
            <Text className="text-14">{"热"}</Text>
          </View>
          <View className="frame-16">
            <svg className="vector-4" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#7a6350" strokeWidth="3" ><path d="m7 11 4.08 10.35a1 1 0 0 0 1.84 0L17 11M17 7A5 5 0 0 0 7 7M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4" /></svg>
            <Text className="text-15">{"冰"}</Text>
          </View>
        </View>
      </View>
      <View className="frame-17">
        <Text className="text-16">{"加料"}</Text>
        <View className="frame-18">
          <View className="frame-19">
            <View className="frame-20">
              <Text className="text-17">{"燕麦奶加浓"}</Text>
              <Text className="text-18">{"奶香更醇厚"}</Text>
            </View>
            <View className="frame-21">
              <Text className="text-19">{"+¥3.00"}</Text>
              <View className="frame-22"></View>
            </View>
          </View>
          <View className="frame-23">
            <View className="frame-24">
              <Text className="text-20">{"海盐奶盖"}</Text>
              <Text className="text-21">{"微咸回甘"}</Text>
            </View>
            <View className="frame-25">
              <Text className="text-22">{"+¥5.00"}</Text>
              <View className="frame-26"></View>
            </View>
          </View>
          <View className="frame-27">
            <View className="frame-28">
              <Text className="text-23">{"焦糖糖浆"}</Text>
              <Text className="text-24">{"焦香微苦"}</Text>
            </View>
            <View className="frame-29">
              <Text className="text-25">{"+¥2.00"}</Text>
              <View className="frame-30"></View>
            </View>
          </View>
          <View className="frame-31">
            <View className="frame-32">
              <Text className="text-26">{"双份浓缩"}</Text>
              <Text className="text-27">{"提神加倍"}</Text>
            </View>
            <View className="frame-33">
              <Text className="text-28">{"+¥6.00"}</Text>
              <View className="frame-34"></View>
            </View>
          </View>
        </View>
      </View>
      <View className="frame-35">
        <View className="frame-36">
          <Text className="text-29">{"合计"}</Text>
          <Text className="text-30">{"¥32.00"}</Text>
        </View>
        <Button className="button-2" onClick={() => { Taro.navigateTo({ url: "/pages/p-3/index" }) }}>{"加入购物车"}</Button>
      </View>
    </View>
  )
}
