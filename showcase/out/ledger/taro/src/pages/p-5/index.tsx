import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function PageP5() {
  return (
    <View id="page-372" className="page-1">
      <View className="frame-1">
        <Text className="text-1">{"统计"}</Text>
        <View className="frame-2">
          <Text className="text-2">{"本周"}</Text>
          <Text className="text-3">{"本月"}</Text>
          <Text className="text-4">{"本年"}</Text>
        </View>
      </View>
      <View className="frame-3">
        <Text className="text-5">{"分类占比"}</Text>
        <View className="frame-4">
          <View className="frame-5">
            <View className="frame-6">
              <Text className="text-6">{"餐饮"}</Text>
              <View className="frame-7">
                <Text className="text-7">{"¥1,286.50"}</Text>
                <Text className="text-8">{"30%"}</Text>
              </View>
            </View>
            <View className="frame-8">
              <View className="rectangle-1"></View>
            </View>
          </View>
          <View className="frame-9">
            <View className="frame-10">
              <Text className="text-9">{"购物"}</Text>
              <View className="frame-11">
                <Text className="text-10">{"¥940.00"}</Text>
                <Text className="text-11">{"22%"}</Text>
              </View>
            </View>
            <View className="frame-12">
              <View className="rectangle-2"></View>
            </View>
          </View>
          <View className="frame-13">
            <View className="frame-14">
              <Text className="text-12">{"居家"}</Text>
              <View className="frame-15">
                <Text className="text-13">{"¥468.00"}</Text>
                <Text className="text-14">{"11%"}</Text>
              </View>
            </View>
            <View className="frame-16">
              <View className="rectangle-3"></View>
            </View>
          </View>
          <View className="frame-17">
            <View className="frame-18">
              <Text className="text-15">{"娱乐"}</Text>
              <View className="frame-19">
                <Text className="text-16">{"¥520.00"}</Text>
                <Text className="text-17">{"12%"}</Text>
              </View>
            </View>
            <View className="frame-20">
              <View className="rectangle-4"></View>
            </View>
          </View>
          <View className="frame-21">
            <View className="frame-22">
              <Text className="text-18">{"交通"}</Text>
              <View className="frame-23">
                <Text className="text-19">{"¥386.00"}</Text>
                <Text className="text-20">{"9%"}</Text>
              </View>
            </View>
            <View className="frame-24">
              <View className="rectangle-5"></View>
            </View>
          </View>
          <View className="frame-25">
            <View className="frame-26">
              <Text className="text-21">{"学习"}</Text>
              <View className="frame-27">
                <Text className="text-22">{"¥1,180.00"}</Text>
                <Text className="text-23">{"16%"}</Text>
              </View>
            </View>
            <View className="frame-28">
              <View className="rectangle-6"></View>
            </View>
          </View>
        </View>
      </View>
      <View className="frame-29">
        <Text className="text-24">{"本月支出趋势"}</Text>
        <View className="frame-30">
          <View className="frame-31">
            <Text className="text-25">{"最高的一天 11-25"}</Text>
            <Text className="text-26">{"¥1,180.00"}</Text>
          </View>
          <View className="rectangle-7"></View>
          <View className="frame-32">
            <Text className="text-27">{"日均"}</Text>
            <Text className="text-28">{"¥153.09"}</Text>
          </View>
        </View>
      </View>
      <View className="frame-33" onClick={() => { Taro.reLaunch({ url: "/pages/p-2/index" }) }}>
        <Text className="text-29">{"查看明细"}</Text>
      </View>
    </View>
  )
}
