import { View, Text, Image, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function PageP3() {
  return (
    <View id="page-215" className="page-1">
      <View className="frame-1">
        <svg className="vector-1" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#ffffff" strokeWidth="2.4" ><path d="m15 18-6-6 6-6" /></svg>
        <Text className="text-1">{"歌单"}</Text>
        <svg className="vector-2" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#ffffff" strokeWidth="2.4" ><path d="M11 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M18 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0M4 12a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" /></svg>
      </View>
      <View className="frame-2">
        <div className="image-1 ui-image-placeholder ui-image-ph-hero-353"></div>
        <Text className="text-2">{"城市夜行"}</Text>
        <Text className="text-3">{"深夜通勤与失眠时刻的低频合成器、冷色氛围与人声碎片，一路从写字楼开到江边。"}</Text>
        <View className="frame-3">
          <View className="frame-4">
            <svg className="vector-3" width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#a1a1aa" strokeWidth="4" ><path d="M6 3L20 12L6 21L6 3Z" /></svg>
            <Text className="text-4">{"128 万次播放"}</Text>
          </View>
          <View className="rectangle-1"></View>
          <Text className="text-5">{"42 首 · 2 小时 16 分"}</Text>
        </View>
      </View>
      <View className="frame-5">
        <Button className="button-1" onClick={() => { Taro.navigateTo({ url: "/pages/p-2/index" }) }}>{"播放全部"}</Button>
        <View className="frame-6">
          <View className="frame-7">
            <svg className="vector-4" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#e4e4e7" strokeWidth="3" ><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
            <Text className="text-6">{"收藏 8.4k"}</Text>
          </View>
          <View className="frame-8">
            <svg className="vector-5" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#e4e4e7" strokeWidth="3" ><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10L12 15L17 10M12 15L12 3" /></svg>
            <Text className="text-7">{"下载"}</Text>
          </View>
          <View className="frame-9">
            <svg className="vector-6" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" fillRule="nonzero" stroke="#e4e4e7" strokeWidth="3" ><path d="M15 5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M3 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M15 19a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49" /></svg>
            <Text className="text-8">{"分享"}</Text>
          </View>
        </View>
      </View>
      <View className="frame-10">
        <View className="frame-11">
          <Text className="text-9">{"TRACKS"}</Text>
          <Text className="text-10">{"共 42 首"}</Text>
        </View>
        <View className="rectangle-2"></View>
        <View className="frame-12">
          <Text className="text-11">{"01"}</Text>
          <View className="frame-13">
            <Text className="text-12">{"霓虹折旧"}</Text>
            <Text className="text-13">{"回声 / 林晚"}</Text>
          </View>
          <Text className="text-14">{"3:42"}</Text>
        </View>
        <View className="frame-14">
          <Text className="text-15">{"02"}</Text>
          <View className="frame-15">
            <Text className="text-16">{"江风倒带"}</Text>
            <Text className="text-17">{"回声"}</Text>
          </View>
          <Text className="text-18">{"4:05"}</Text>
        </View>
        <View className="frame-16">
          <Text className="text-19">{"03"}</Text>
          <View className="frame-17">
            <Text className="text-20">{"凌晨三点的便利店"}</Text>
            <Text className="text-21">{"回声 / 陈默"}</Text>
          </View>
          <Text className="text-22">{"2:58"}</Text>
        </View>
        <View className="frame-18">
          <Text className="text-23">{"04"}</Text>
          <View className="frame-19">
            <Text className="text-24">{"地铁末班车"}</Text>
            <Text className="text-25">{"回声"}</Text>
          </View>
          <Text className="text-26">{"3:26"}</Text>
        </View>
        <View className="frame-20">
          <Text className="text-27">{"05"}</Text>
          <View className="frame-21">
            <Text className="text-28">{"雾中高架桥"}</Text>
            <Text className="text-29">{"回声 / 白鹭"}</Text>
          </View>
          <Text className="text-30">{"5:11"}</Text>
        </View>
        <View className="frame-22">
          <Text className="text-31">{"06"}</Text>
          <View className="frame-23">
            <Text className="text-32">{"回声未读"}</Text>
            <Text className="text-33">{"回声"}</Text>
          </View>
          <Text className="text-34">{"3:19"}</Text>
        </View>
      </View>
    </View>
  )
}
