"use client";

import { useState } from "react";
import { CurrentTitleHero, TitleGallery } from "@/features/titles/components";
import { titleCatalog, findTitleById } from "@/data/titleCatalog";
import type { TitleCatalogItem } from "@/types/title";
import styles from "@/features/titles/components/title-components.module.css";

const TITLE_LABELS: Record<string, string> = {
  "titles.growth.sproutPartner": "新芽伙伴",
  "titles.growth.reliablePartner": "靠谱伙伴",
  "titles.growth.steadyContributor": "稳定输出者",
  "titles.growth.progressStar": "进步之星",
  "titles.growth.excellentPartner": "优秀伙伴",
  "titles.growth.storeBackbone": "门店中坚",
  "titles.growth.benchmark": "成长标兵",
  "titles.growth.teamCore": "团队核心",
  "titles.growth.roleModel": "榜样伙伴",
  "titles.growth.zhaoStar": "ZHAO 之星",
  "titles.front.smileHost": "微笑接待官",
  "titles.front.serviceHelper": "服务小能手",
  "titles.front.customerFavorite": "顾客好感王",
  "titles.front.floorRhythm": "前厅节奏师",
  "titles.front.tableTurnover": "翻台小旋风",
  "titles.front.serviceVibe": "服务气氛组",
  "titles.front.controlExpert": "控场达人",
  "titles.front.complaintCloser": "客诉终结者",
  "titles.front.commander": "前厅指挥官",
  "titles.front.storeFace": "门店门面担当",
  "titles.kitchen.outputGuardian": "出品守护者",
  "titles.kitchen.prepHelper": "备货小能手",
  "titles.kitchen.heatController": "火候掌控者",
  "titles.kitchen.steadyKing": "后厨稳定王",
  "titles.kitchen.cuttingEfficiency": "效率切配手",
  "titles.kitchen.qualityGatekeeper": "品质把关官",
  "titles.kitchen.rhythmMaster": "厨房节奏师",
  "titles.kitchen.servingAccelerator": "出餐加速器",
  "titles.kitchen.core": "后厨核心",
  "titles.kitchen.tasteGuardian": "味道守门人",
  "titles.management.coachCaptain": "带教小队长",
  "titles.management.shiftLead": "领班先锋",
  "titles.management.goalExecutor": "目标执行官",
  "titles.management.schedulePlanner": "排班规划师",
  "titles.management.costObserver": "成本观察员",
  "titles.management.teamEngine": "团队发动机",
  "titles.management.risingStar": "管理新星",
  "titles.management.operator": "运营小掌柜",
  "titles.management.storeStrategist": "门店操盘手",
  "titles.management.championManager": "冠军店长",
  "titles.fun.neverDrops": "永不掉链子",
  "titles.fun.todayReliable": "今日靠谱人",
  "titles.fun.storeAnchor": "门店定海神针",
  "titles.fun.rescueHero": "救场小英雄",
  "titles.fun.peakWarrior": "高峰期战神",
  "titles.fun.zeroComplaintGuardian": "零投诉守护者",
  "titles.fun.fillMaster": "补位大师",
  "titles.fun.universalScrew": "万能螺丝钉",
  "titles.fun.clearMinded": "人间清醒伙伴",
  "titles.fun.zhaoAce": "ZHAO 家王牌",
  "titles.premium.fiveStarPartner": "五星伙伴",
  "titles.premium.goldPartner": "金牌伙伴",
  "titles.premium.honorPartner": "荣耀伙伴",
  "titles.premium.excellentManager": "卓越经理",
  "titles.premium.aceManager": "王牌经理",
  "titles.premium.peakManager": "巅峰店长",
  "titles.premium.championManager": "冠军店长",
  "titles.premium.legendManager": "传奇店长",
  "titles.premium.brandGuardian": "品牌守护者",
  "titles.premium.zhaoCrown": "ZHAO 荣耀之冠",
};

function getTitleLabel(item: TitleCatalogItem): string {
  return TITLE_LABELS[item.i18nKey] || item.i18nKey;
}

export default function TitleSystemDemoPage() {
  const [selectedTitleId, setSelectedTitleId] = useState("front-commander");
  const currentTitle = findTitleById(selectedTitleId) ?? titleCatalog[0];

  return (
    <main className={styles.titlePage}>
      <div className={styles.titleShell}>
        <header className={styles.titleHeader}>
          <h1>员工称号展示框</h1>
          <p>
            称号用于 Profile、成长中心和晋升路线的身份展示；文字来自外部 i18n，SVG 只负责展示框、纹理和图形。
          </p>
        </header>

        <CurrentTitleHero
          item={currentTitle}
          title={getTitleLabel(currentTitle)}
          subtitle="当前佩戴称号 · 用于员工资料页主展示"
          progress={100}
        />

        <TitleGallery
          titles={titleCatalog}
          getTitleLabel={getTitleLabel}
          getSubtitle={(item) => `${item.category} · ${item.iconType}`}
          selectedTitleId={selectedTitleId}
          lockedTitleIds={["premium-zhao-crown", "management-champion-manager"]}
          progressByTitleId={{
            "premium-zhao-crown": 46,
            "management-champion-manager": 62,
          }}
          onSelect={setSelectedTitleId}
        />
      </div>
    </main>
  );
}
