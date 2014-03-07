mkdir -p ug
for curFile in *.js; do
	echo $curFile
    uglifyjs "$curFile" -b -o "ug/${curFile}"
done
