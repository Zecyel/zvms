<template>
  <v-card>
    <v-card-title class="pt-0">
      <v-container style="margin-bottom: -30px">
        <v-row>
          <v-col cols="8" class="pl-3 ma-0">
            未审核感想列表
            <v-btn @click="fetchThoughts" size="xsmall">
              <v-icon icon="mdi-reload" size="xsmall" />
            </v-btn>
          </v-col>
          <v-col cols="4" class="pa-0 ma-0 h-50">
            <v-select
              x-small
              v-model="status"
              label="状态筛选"
              :items="
                [
                  ThoughtStatus.Accepted,
                  ThoughtStatus.Draft,
                  ThoughtStatus.WaitingForFinalAudit,
                ].map((v) => ({
                  name: getThoughtStatusName(v),
                  id: v,
                }))
              "
              item-title="name"
              item-value="id"
              prepend-icon="mdi-list-status"
              @update:model-value="fetchThoughts"
            />
          </v-col>
        </v-row>
      </v-container>
    </v-card-title>
    <data-table
      fixed-header
      :headers="headers"
      :items="thoughts"
      @click:row="onRowClick"
    >
      <template v-slot:body v-if="thoughts.length === 0">
        <p class="text-center">是空的~</p>
      </template>
      <template v-slot:item.name="{ item }">
        <div class="vol-name-in-table">
          {{ item.raw.name }}
        </div>
      </template>
    </data-table>
  </v-card>
  <v-dialog v-model="dialog" persistent fullscreen scrollable>
    <v-card>
      <v-card-title>详细信息</v-card-title>
      <v-card-text>
        <vol-info
          v-if="currentVol"
          :vol-id="currentThoughtInfo!.volId"
          :vol="currentVol"
          :signup-rollupable="signupRollupable"
        />
        <thought-viewer
          v-if="currentThoughtData"
          :stu-name="currentThoughtInfo!.stuName"
          :thought="currentThoughtData"
          :showWordCount="true"
        />
        <v-spacer />
        发放的{{ getVolTypeName(currentVol!.type) }}时长（分钟）
        <v-text-field
          v-model.number="currentReward"
          type="text"
          prepend-icon="mdi-clock-time-three-outline"
          :disabled="!isAuditing"
        />
      </v-card-text>
      <v-card-actions>
        <v-btn
          color="green"
          class="action"
          @click.prevent="audit(true)"
          v-if="isAuditing"
        >
          通过
        </v-btn>
        <v-btn
          color="red"
          class="action"
          @click.prevent="audit(false)"
          v-if="isAuditing"
        >
          打回
        </v-btn>
        <v-btn color="black" class="action" @click.prevent="dialog = false">
          关闭
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { confirm } from "@/utils/dialogs";
// import {
//   validate,
//   validateNotNAN,
//   validateNotLargerThan,
//   validateNotNegative,
// } from "@/utils/validation";
import {
  fApi,
  getVolTypeName,
  type VolunteerInfoResponse,
  type ThoughtInfoResponse,
  ThoughtStatus,
  type SingleThought,
  getThoughtStatusName,
  Categ,
} from "@/apis";
import { useInfoStore } from "@/stores";
import { timeToHint } from "@/utils/calc";
import { mapStores } from "pinia";
import { VDataTable as DataTable } from "vuetify/labs/VDataTable";
import ThoughtViewer from "@/components/thought/viewer.vue";
import VolInfo from "@/components/vol/vol-info.vue";

export default {
  components: {
    DataTable,
    VolInfo,
    ThoughtViewer,
  },
  data() {
    return {
      timeToHint,
      getVolTypeName,
      ThoughtStatus,
      getThoughtStatusName,
      headers: [
        {
          key: "volName",
          title: "义工名称",
          value: "volName",
          // align: "start",
          sortable: true,
          width:500
        },
        {
          key: "stuName",
          title: "提交者",
          value: "stuName",
          // align: "start",
          sortable: true,
          width:200
        },
        { key: "stuId", title: "学号", value: "stuId", width: 200 },
      ],

      thoughts: [] as SingleThought[],

      dialog: false,
      currentVol: undefined as VolunteerInfoResponse | undefined,
      currentThoughtInfo: undefined as SingleThought | undefined,
      currentThoughtData: undefined as ThoughtInfoResponse | undefined,
      currentReward: NaN,
      status: ThoughtStatus.WaitingForFinalAudit,
    };
  },
  beforeMount() {
    this.fetchThoughts();
  },
  methods: {
    fetchThoughts() {
      //
      fApi.skipOkToast.searchThoughts({
        status: this.status,
        /*status: ThoughtStatus.WaitingForFinalAudit,*/
      })((result: SingleThought[]) => {
        this.thoughts = result;
      });
    },
    onRowClick(
      _event: Event,
      value: {
        item: any;
      }
    ) {
      const item = value.item.raw as SingleThought;
      this.currentThoughtInfo = item;
      fApi.skipOkToast.getVolunteerInfo(item.volId)((volunteer) => {
        fApi.skipOkToast.getThoughtInfo(
          item.volId,
          item.stuId
        )((thought) => {
          this.currentVol = volunteer;
          this.currentThoughtData = thought;
          this.currentReward = volunteer.reward;
          this.dialog = true;
        });
      });
    },
    /**
     * @param status `true` for ok.
     */
    async audit(status: boolean) {
      if (await confirm()) {
        if (status) {
          fApi.finalAudit(
            this.currentThoughtInfo!.volId,
            this.currentThoughtInfo!.stuId,
            this.currentReward
          )(() => {
            this.fetchThoughts();
            this.dialog = false;
          });
        } else {
          fApi.repulseThought(
            this.currentThoughtInfo!.volId,
            this.currentThoughtInfo!.stuId,
            ""
          )(() => {
            this.fetchThoughts();
            this.dialog = false;
          });
        }
      }
    },
  },
  computed: {
    signupRollupable(): boolean {
      const enoughPermission = Boolean(
        this.infoStore.permission & (Categ.Manager | Categ.System)
      );
      const isHolder = this.infoStore.userId === this.currentVol!.holder;
      const isThisClassSecretary = false; // (this.infoStore.permission&Categ.Class)&&this.currentVol!.joiners[0]..??;
      return enoughPermission || isHolder || isThisClassSecretary;
    },
    isAuditing() {
      return (
        this.currentThoughtData!.status == ThoughtStatus.WaitingForFinalAudit
      );
    },
    ...mapStores(useInfoStore),
  },
};
</script>

<style scoped>
.action {
  width: 30%;
  border: 1px solid currentColor;
}
</style>
