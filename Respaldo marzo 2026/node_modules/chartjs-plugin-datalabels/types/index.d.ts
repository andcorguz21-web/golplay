import {ChartType, Plugin} from 'chart.js';
import {Options} from 'chartjs-plugin-datalabels/types/options';

declare module 'chart.js' {
  interface ChartDatasetProperties<TType extends ChartType, TData> {
    /**
     * Per dataset datalabels plugin options.
     * @since 0.1.0
     */
    datalabels?: Options;
  }

  interface PluginOptionsByType<TType extends ChartType> {
    /**
     * Per chart datalabels plugin options.
     * @since 0.1.0
     */
    datalabels?: Options;
  }
}

declare const plugin: Plugin;

export * from 'chartjs-plugin-datalabels/types/context';

export default plugin;
