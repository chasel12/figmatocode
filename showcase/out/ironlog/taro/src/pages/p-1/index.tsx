import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function PageP1() {
  return (
    <View id="page-1" className="page-1">
      <View className="frame-1">
        <Text className="text-1">{"铁志"}</Text>
      </View>
      <View className="rectangle-1"></View>
      <View className="frame-2">
        <Text className="text-2">{"MON · 第 6 周"}</Text>
        <Text className="text-3">{"今日"}</Text>
      </View>
      <View className="frame-3">
        <View className="frame-4">
          <Text className="text-4">{"本周完成"}</Text>
          <View className="frame-5">
            <Text className="text-5">{"3 / 4"}</Text>
            <Text className="text-6">{"次"}</Text>
          </View>
        </View>
        <View className="rectangle-2"></View>
        <View className="frame-6">
          <Text className="text-7">{"累计容量"}</Text>
          <View className="frame-7">
            <Text className="text-8">{"12.4"}</Text>
            <Text className="text-9">{"吨"}</Text>
          </View>
        </View>
      </View>
      <View className="frame-8">
        <Text className="text-10">{"今日计划"}</Text>
        <View className="frame-9">
          <View className="frame-10">
            <Text className="text-11">{"杠铃深蹲"}</Text>
            <Text className="text-12">{"5×5"}</Text>
            <Text className="text-13">{"100kg"}</Text>
          </View>
          <View className="frame-11">
            <Text className="text-14">{"罗马尼亚硬拉"}</Text>
            <Text className="text-15">{"4×8"}</Text>
            <Text className="text-16">{"80kg"}</Text>
          </View>
          <View className="frame-12">
            <Text className="text-17">{"腿举"}</Text>
            <Text className="text-18">{"3×12"}</Text>
            <Text className="text-19">{"160kg"}</Text>
          </View>
          <View className="frame-13">
            <Text className="text-20">{"站姿提踵"}</Text>
            <Text className="text-21">{"3×15"}</Text>
            <Text className="text-22">{"60kg"}</Text>
          </View>
          <View className="rectangle-3"></View>
        </View>
      </View>
      <View className="frame-14">
        <Button className="button-1">{"开始训练"}</Button>
      </View>
      <View className="frame-15">
        <View className="frame-16">
          <Text className="text-23">{"今日"}</Text>
          <View className="rectangle-4"></View>
        </View>
        <View className="frame-17" onClick={() => { Taro.reLaunch({ url: "/pages/p-3/index" }) }}>
          <Text className="text-24">{"动作库"}</Text>
        </View>
        <View className="frame-18" onClick={() => { Taro.reLaunch({ url: "/pages/p-6/index" }) }}>
          <Text className="text-25">{"我的"}</Text>
        </View>
      </View>
    </View>
  )
}
