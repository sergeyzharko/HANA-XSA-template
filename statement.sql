with t1_mol as (
select distinct
	"cty",
	"mol_list",
	"mol",
	"crp"
	from "SXGMDA"."gmda.monthly.cv::cv_ana_monthly" (placeholder."$$IP_CURR$$"=>'EUR', placeholder."$$IP_VERSION$$"=>'PROD') dm
where
(

		(
			(
		(
			("crp" in ('BAXTER INT'))
		))
		)
) and (( "month_rel_id" = (0) AND "agg_type" = ('MONTH') )
)
),

t1 as ( -- filters, grouping
select
	"cty" as "cty",
	"mol_list" as "mol_list",
	"crp" as "crp",
	CASE WHEN "month_rel_id" = 0 AND "agg_type" = 'MONTH' THEN SUM("eur_mnf") ELSE 0 END as "eur_mnf"
from "SXGMDA"."gmda.monthly.cv::cv_ana_monthly" (placeholder."$$IP_CURR$$"=>'EUR', placeholder."$$IP_VERSION$$"=>'PROD') dm
where (( "month_rel_id" = (0) AND "agg_type" = ('MONTH')  )
)
group by "agg_type", "cty", "mol_list", "crp", "month_rel_id"
),

t2 as ( -- aggregation
select distinct
	"cty",
	"mol_list",
	SUM("eur_mnf") OVER () as "eur_mnf/Total",
	SUM("eur_mnf") OVER (PARTITION BY "cty") as "eur_mnf/cty",
	SUM("eur_mnf") OVER (PARTITION BY "cty", "mol_list") as "eur_mnf/cty, mol_list",
	SUM("eur_mnf") OVER (PARTITION BY "cty", "mol_list", "mol_list") as "eur_mnf/cty, mol_list, mol"
from t1
where
(

		(
			(
		(
			("crp" in ('BAXTER INT'))
		))
		)
)
),

t2a as ( -- join
select distinct
	t2."cty",
	t2."mol_list",
	t1_mol."mol",
	t2."eur_mnf/Total",
	t2."eur_mnf/cty",
	t2."eur_mnf/cty, mol_list",
	t2."eur_mnf/cty, mol_list, mol"
from t2 left outer join t1_mol on t2."cty" = t1_mol."cty" and t2."mol_list" = t1_mol."mol_list" and t2."mol_list" = t1_mol."mol_list"
),

t3 as (
select
	CAST("cty" AS VARCHAR) as "cty",
	CAST("mol_list" AS VARCHAR) as "mol_list",
	CAST("mol" AS VARCHAR) as "mol",
	"eur_mnf/Total",
	"eur_mnf/cty",
	"eur_mnf/cty, mol_list",
	"eur_mnf/cty, mol_list, mol"
from t2a
),

t7 as ( -- sorting, formatting
select
	--'Total' as "Total",
	cast('Total' as nvarchar(1000)) as "Total",
	"cty",
	"mol_list",
	"mol",
	TO_NVARCHAR(IFNULL(ROUND("eur_mnf/Total" / 1000, 0), 0) + 0.00, '9,999') as "eur_mnf/Total",
	null as "rank_eur_mnf/Total",
	DENSE_RANK() OVER (ORDER BY "eur_mnf/cty" desc) as "rank_eur_mnf/cty",
	TO_NVARCHAR(IFNULL(ROUND("eur_mnf/cty" / 1000, 0), 0) + 0.00, '9,999') as "eur_mnf/cty",
	TO_NVARCHAR(IFNULL(ROUND("eur_mnf/cty, mol_list" / 1000, 0), 0) + 0.00, '9,999') as "eur_mnf/cty, mol_list",
	DENSE_RANK() OVER (PARTITION BY "cty" ORDER BY "eur_mnf/cty, mol_list" desc) as "rank_eur_mnf/cty, mol_list",
	TO_NVARCHAR(IFNULL(ROUND("eur_mnf/cty, mol_list, mol" / 1000, 0), 0) + 0.00, '9,999') as "eur_mnf/cty, mol_list, mol",
	DENSE_RANK() OVER (PARTITION BY "cty", "mol_list" ORDER BY "eur_mnf/cty, mol_list, mol" desc) as "rank_eur_mnf/cty, mol_list, mol",
	DENSE_RANK() OVER (ORDER BY "eur_mnf/cty" desc, "cty" desc) as "row_num_cty",
	DENSE_RANK() OVER (ORDER BY "eur_mnf/cty, mol_list" desc, "cty" desc, "mol_list" desc) as "row_num_mol_list"
from t3
)

select * from (
	select distinct
		'Total' as "Level",
		0 as "row_num_Total",
		1 as "row_num_cty",
		1 as "row_num_mol_list",
		0 as "row_num_ShownOther",
		"Total" as "NodeName",
		"Total" as "NodeID",
		0 as "HierarchyLevel",
		--'root' as "ParentNodeID",
		cast('root' as nvarchar(1000)) as "ParentNodeID",
		'expanded' as "DrillState",
		IFNULL(null,' All') as "cty",
		IFNULL(null,' All') as "mol_list",
		IFNULL(null,' All') as "mol",
		"rank_eur_mnf/Total" as "rank_eur_mnf"
	from t7
	union all
		select distinct
		'cty' as "Level",
		0 as "row_num_Total",
		("row_num_cty"+1) as "row_num_cty",
		1 as "row_num_mol_list",
		0 as "row_num_ShownOther",
		"cty" as "NodeName",
		CONCAT(CONCAT("Total", '//'), IFNULL("cty",'cty')) as "NodeID",
		1 as "HierarchyLevel",
		'root' as "ParentNodeID",
		'expanded' as "DrillState",
		IFNULL("cty",' All') as "cty",
		IFNULL(null,' All') as "mol_list",
		IFNULL(null,' All') as "mol",
		"rank_eur_mnf/cty" as "rank_eur_mnf/cty"
	from t7
	union all
		select distinct
		'mol_list' as "Level",
		0 as "row_num_Total",
		("row_num_cty"+1) as "row_num_cty",
		("row_num_mol_list"+1) as "row_num_mol_list",
		0 as "row_num_ShownOther",
		"mol_list" as "NodeName",
		CONCAT(CONCAT(CONCAT(CONCAT("Total", '//'), IFNULL("cty",'cty')), '//'), IFNULL("mol_list",'mol_list')) as "NodeID",
		2 as "HierarchyLevel",
		CONCAT(CONCAT("Total", '//'), IFNULL("cty",'cty')) as "ParentNodeID",
		'expanded' as "DrillState",
		IFNULL("cty",' All') as "cty",
		IFNULL("mol_list",' All') as "mol_list",
		IFNULL(null,' All') as "mol",
		"rank_eur_mnf/cty, mol_list" as "rank_eur_mnf/cty, mol_list"
	from t7
	)