import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function PageP3() {
  return (
    <View id="page-88" className="page-1">
      <View className="frame-1">
        <Text className="text-1">{"TRAINING LIBRARY"}</Text>
        <Text className="text-2">{"动作库"}</Text>
        <View className="frame-2">
          <svg className="vector-1" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#A3A3A3" strokeWidth="3" ><path d="M3 11a8 8 0 1 0 16 0a8 8 0 1 0 -16 0m21 21-4.3-4.3" /></svg>
          <Text className="text-3">{"搜索动作、肌群"}</Text>
        </View>
      </View>
      <View className="rectangle-1"></View>
      <View className="frame-3">
        <View className="frame-4">
          <Text className="text-4">{"腿"}</Text>
        </View>
        <View className="frame-5">
          <Text className="text-5">{"背"}</Text>
        </View>
        <View className="frame-6">
          <Text className="text-6">{"胸"}</Text>
        </View>
        <View className="frame-7">
          <Text className="text-7">{"肩"}</Text>
        </View>
      </View>
      <View className="rectangle-2"></View>
      <View className="frame-8">
        <View className="frame-9">
          <Text className="text-8">{"01"}</Text>
          <Text className="text-9">{"杠铃深蹲"}</Text>
        </View>
        <View className="frame-10">
          <Text className="text-10">{"股四头"}</Text>
          <Text className="text-11">{"120kg"}</Text>
        </View>
      </View>
      <View className="frame-11">
        <View className="frame-12">
          <Text className="text-12">{"02"}</Text>
          <Text className="text-13">{"硬拉"}</Text>
        </View>
        <View className="frame-13">
          <Text className="text-14">{"后链"}</Text>
          <Text className="text-15">{"140kg"}</Text>
        </View>
      </View>
      <View className="frame-14">
        <View className="frame-15">
          <Text className="text-16">{"03"}</Text>
          <Text className="text-17">{"保加利亚分腿蹲"}</Text>
        </View>
        <View className="frame-16">
          <Text className="text-18">{"臀"}</Text>
          <Text className="text-19">{"60kg"}</Text>
        </View>
      </View>
      <View className="frame-17">
        <View className="frame-18">
          <Text className="text-20">{"04"}</Text>
          <Text className="text-21">{"腿弯举"}</Text>
        </View>
        <View className="frame-19">
          <Text className="text-22">{"腘绳"}</Text>
          <Text className="text-23">{"55kg"}</Text>
        </View>
      </View>
      <View className="frame-20">
        <View className="frame-21">
          <Text className="text-24">{"05"}</Text>
          <Text className="text-25">{"引体向上"}</Text>
        </View>
        <View className="frame-22">
          <Text className="text-26">{"背阔"}</Text>
          <Text className="text-27">{"20kg"}</Text>
        </View>
      </View>
      <View className="frame-23">
        <View className="frame-24">
          <Text className="text-28">{"06"}</Text>
          <Text className="text-29">{"杠铃划船"}</Text>
        </View>
        <View className="frame-25">
          <Text className="text-30">{"中背"}</Text>
          <Text className="text-31">{"85kg"}</Text>
        </View>
      </View>
      <View className="frame-26">
        <View className="frame-27">
          <Text className="text-32">{"07"}</Text>
          <Text className="text-33">{"卧推"}</Text>
        </View>
        <View className="frame-28">
          <Text className="text-34">{"胸大肌"}</Text>
          <Text className="text-35">{"90kg"}</Text>
        </View>
      </View>
      <View className="frame-29">
        <View className="frame-30">
          <Text className="text-36">{"08"}</Text>
          <Text className="text-37">{"站姿推举"}</Text>
        </View>
        <View className="frame-31">
          <Text className="text-38">{"三角肌"}</Text>
          <Text className="text-39">{"55kg"}</Text>
        </View>
      </View>
      <View className="frame-32">
        <View className="frame-33" onClick={() => { Taro.reLaunch({ url: "/pages/p-1/index" }) }}>
          <Text className="text-40">{"今日"}</Text>
        </View>
        <View className="frame-34">
          <Text className="text-41">{"动作库"}</Text>
          <View className="rectangle-3"></View>
        </View>
        <View className="frame-35" onClick={() => { Taro.reLaunch({ url: "/pages/p-6/index" }) }}>
          <Text className="text-42">{"我的"}</Text>
        </View>
      </View>
    </View>
  )
}
