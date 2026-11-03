import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function PageP1() {
  return (
    <View id="page-1" className="page-1">
      <View className="frame-1">
        <View className="frame-2">
          <View className="frame-3">
            <svg className="vector-1" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#b5654a" strokeWidth="3" ><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0M9 10a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /></svg>
            <Text className="text-1">{"望京 SOHO 店"}</Text>
            <Text className="text-2">{"320m"}</Text>
          </View>
          <View className="frame-4">
            <svg className="vector-2" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#b5654a" strokeWidth="3" ><path d="m6 9 6 6 6-6" /></svg>
          </View>
        </View>
        <View className="frame-5">
          <Text className="text-3">{"下午好"}</Text>
          <Text className="text-4">{"今天想喝点什么？手冲豆子新鲜到店"}</Text>
        </View>
        <View className="frame-6">
          <View className="frame-7">
            <Text className="text-5">{"推荐"}</Text>
          </View>
          <View className="frame-8">
            <Text className="text-6">{"美式"}</Text>
          </View>
          <View className="frame-9">
            <Text className="text-7">{"拿铁"}</Text>
          </View>
          <View className="frame-10">
            <Text className="text-8">{"特调"}</Text>
          </View>
          <View className="frame-11">
            <Text className="text-9">{"甜点"}</Text>
          </View>
        </View>
      </View>
      <View className="frame-12">
        <View className="frame-13">
          <View className="frame-14">
            <View className="frame-15">
              <svg className="vector-3" width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#b5654a" strokeWidth="1.5" ><path d="M10 2v2M14 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1M6 2v2" /></svg>
            </View>
            <View className="frame-16">
              <Text className="text-10">{"燕麦拿铁"}</Text>
              <Text className="text-11">{"Oat Latte"}</Text>
            </View>
            <View className="frame-17">
              <Text className="text-12">{"¥32.00"}</Text>
              <Text className="text-13">{"查看详情"}</Text>
            </View>
          </View>
          <View className="frame-18">
            <View className="frame-19">
              <svg className="vector-4" width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#b5654a" strokeWidth="1.5" ><path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8M5 8h14M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0m12 8 1-6h2" /></svg>
            </View>
            <View className="frame-20">
              <Text className="text-14">{"海盐焦糖玛奇朵"}</Text>
              <Text className="text-15">{"Sea Salt Caramel Macchiato"}</Text>
            </View>
            <View className="frame-21">
              <Text className="text-16">{"¥36.00"}</Text>
              <Text className="text-17">{"查看详情"}</Text>
            </View>
          </View>
          <View className="frame-22">
            <View className="frame-23">
              <svg className="vector-5" width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#b5654a" strokeWidth="1.5" ><path d="M21.66 17.67a1.08 1.08 0 0 1-.04 1.6A12 12 0 0 1 4.73 2.38a1.1 1.1 0 0 1 1.61-.04zM19.65 15.66A8 8 0 0 1 8.35 4.34m14 10-5.5 5.5M14 17.85V10H6.15" /></svg>
            </View>
            <View className="frame-24">
              <Text className="text-18">{"冰摇柠檬美式"}</Text>
              <Text className="text-19">{"Iced Lemon Americano"}</Text>
            </View>
            <View className="frame-25">
              <Text className="text-20">{"¥28.00"}</Text>
              <Text className="text-21">{"查看详情"}</Text>
            </View>
          </View>
          <View className="frame-26">
            <View className="frame-27">
              <svg className="vector-6" width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#b5654a" strokeWidth="1.5" ><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01" /></svg>
            </View>
            <View className="frame-28">
              <Text className="text-22">{"巴斯克芝士蛋糕"}</Text>
              <Text className="text-23">{"Basque Cheesecake"}</Text>
            </View>
            <View className="frame-29">
              <Text className="text-24">{"¥26.00"}</Text>
              <Text className="text-25">{"查看详情"}</Text>
            </View>
          </View>
        </View>
      </View>
      <View className="frame-30">
        <svg className="vector-7" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#faf5ef" strokeWidth="2" ><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0" /></svg>
        <View className="frame-31">
          <Text className="text-26">{"2"}</Text>
        </View>
      </View>
      <View className="frame-32">
        <View className="frame-33">
          <svg className="vector-8" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#b5654a" strokeWidth="2.4" ><path d="M10 2v2M14 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1M6 2v2" /></svg>
          <Text className="text-27">{"点单"}</Text>
        </View>
        <View className="frame-34" onClick={() => { Taro.reLaunch({ url: "/pages/p-5/index" }) }}>
          <svg className="vector-9" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#b9a390" strokeWidth="2.4" ><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11" /></svg>
          <Text className="text-28">{"订单"}</Text>
        </View>
        <View className="frame-35" onClick={() => { Taro.reLaunch({ url: "/pages/p-6/index" }) }}>
          <svg className="vector-10" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#b9a390" strokeWidth="2.4" ><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M8 7a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" /></svg>
          <Text className="text-29">{"我的"}</Text>
        </View>
      </View>
    </View>
  )
}
